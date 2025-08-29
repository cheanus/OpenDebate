from neomodel import db
from core.opinion import create_or_opinion, create_and_opinion
from schemas.db.neo4j import Opinion as OpinionNeo4j
from schemas.link import LinkType
from . import update_score


def create_link(
    from_id: str,
    to_id: str,
    link_type: LinkType,
) -> str:
    """
    Create a link in the Neo4j database.

    :param from_id: The ID of the source node.
    :param to_id: The ID of the target node.
    :param link_type: The type of the link (support or oppose).
    :return: Link ID
    """
    try:
        if from_id == to_id:
            raise ValueError("Cannot create a link from a node to itself.")
        # 检查是否会形成环
        # 检查从to_id是否可达from_id，如果可达则加边会成环
        cycle_query = """
        MATCH (start:Opinion {uid: $to_id}), (end:Opinion {uid: $from_id})
        MATCH path = shortestPath((start)-[:supports|opposes*1..100]->(end))
        RETURN COUNT(path) > 0 AS has_cycle
        """
        results, _ = db.cypher_query(cycle_query, {"from_id": from_id, "to_id": to_id})
        if results and results[0][0]:
            raise ValueError("Adding this link would create a cycle in the graph.")

        from_opinion = OpinionNeo4j.nodes.get(uid=from_id)
        to_opinion = OpinionNeo4j.nodes.get(uid=to_id)

        if link_type == LinkType.SUPPORT:
            if not from_opinion.supports.is_connected(to_opinion):
                relationship = from_opinion.supports.connect(to_opinion)
                link_id = relationship.uid
                update_score.update_node_score_positively_from(from_id)
            else:
                link_id = from_opinion.supports.relationship(to_opinion).uid
        elif link_type == LinkType.OPPOSE:
            if not from_opinion.opposes.is_connected(to_opinion):
                relationship = from_opinion.opposes.connect(to_opinion)
                link_id = relationship.uid
                update_score.update_node_score_positively_from(from_id)
            else:
                link_id = from_opinion.opposes.relationship(to_opinion).uid
        else:
            raise ValueError(f"Unsupported link type: {link_type}")
    except Exception as e:
        raise RuntimeError(f"Failed to create link in Neo4j: {str(e)}")

    return link_id


def delete_link_by_info(link_info: dict[str, str]):
    """
    Delete a link in the Neo4j database.

    :param link_id: The ID of the link to delete.
    """
    try:
        # After deletion, update the scores of the related nodes
        from_opinion = OpinionNeo4j.nodes.get(uid=link_info["from_id"])
        to_opinion = OpinionNeo4j.nodes.get(uid=link_info["to_id"])
        if link_info["link_type"] == LinkType.SUPPORT.value:
            from_opinion.supports.disconnect(to_opinion)
            update_score.update_node_score_positively_recursively(
                link_info["to_id"], {"positive": None}
            )
        elif link_info["link_type"] == LinkType.OPPOSE.value:
            from_opinion.opposes.disconnect(to_opinion)
            update_score.update_node_score_positively_recursively(
                link_info["to_id"], {"negative": None}
            )
        update_score.update_node_score_negatively_recursively(
            link_info["from_id"], new_score=None
        )
    except Exception as e:
        raise RuntimeError(f"Failed to delete link in Neo4j: {str(e)}")


def delete_link(link_id: str):
    """
    Delete a link in the Neo4j database.

    :param link_id: The ID of the link to delete.
    """
    try:
        info = info_link(link_id)
    except Exception as e:
        raise RuntimeError(f"Failed to find link info in Neo4j: {str(e)}")
    delete_link_by_info(info)


def info_link(link_id: str) -> dict[str, str]:
    """
    Get information about a link in the Neo4j database.

    :param link_id: The ID of the link to retrieve.
    :return: A dictionary containing link information.
    """
    try:
        query = """
        MATCH (from:Opinion)-[r]->(to:Opinion)
        WHERE r.uid = $uid
        RETURN from.uid, to.uid, type(r)
        """
        results, _ = db.cypher_query(query, {"uid": link_id})
        if not results:
            raise ValueError("Link not found")

        from_id, to_id, link_type = results[0]
        return {
            "from_id": from_id,
            "to_id": to_id,
            "link_type": link_type,
        }
    except Exception as e:
        raise RuntimeError(f"Failed to retrieve link info from Neo4j: {str(e)}")


def patch_link(link_id: str, link_type: LinkType):
    """
    Patch a link in the Neo4j database.

    :param link_id: The ID of the link to patch.
    :param link_type: The new type of the link (support or oppose).
    """
    try:
        # 查询原关系及其两端节点
        query = """
        MATCH (from:Opinion)-[r]->(to:Opinion)
        WHERE r.uid = $uid
        RETURN from.uid, to.uid, type(r), r.uid
        """
        results, _ = db.cypher_query(query, {"uid": link_id})
        if not results:
            raise ValueError("Link not found")
        from_id, to_id, old_type, rel_uid = results[0]

        # 如果类型未变，直接返回
        if old_type == link_type.value:
            return

        # 删除原关系，并更新分数
        delete_link(link_id)

        # 创建新类型关系，并保留原uid
        create_query = f"""
        MATCH (from:Opinion {{uid: $from_id}}), (to:Opinion {{uid: $to_id}})
        CREATE (from)-[r:{link_type.value} {{uid: $uid}}]->(to)
        """
        db.cypher_query(
            create_query, {"from_id": from_id, "to_id": to_id, "uid": rel_uid}
        )

        # 更新相关节点的分数
        update_score.update_node_score_positively_from(from_id, is_refresh=True)

    except Exception as e:
        raise RuntimeError(f"Failed to patch link in Neo4j: {str(e)}")


def attack_link(link_id: str, debate_id: str) -> tuple[str, str]:
    """
    Split a link into an AND opinion, and create another OR opinion to attack it.

    :param link_id: The ID of the link to delete.
    :param debate_id: The debate ID where the new opinions will be created.
    :return: The ID of the new OR and AND opinions created.
    """
    try:
        link_info = info_link(link_id)
        from_opinion = OpinionNeo4j.nodes.get(uid=link_info["from_id"])
        to_opinion = OpinionNeo4j.nodes.get(uid=link_info["to_id"])
        if to_opinion.logic_type == "and":
            raise ValueError("Cannot attack an AND opinion.")
        # Delete the original link
        if link_info["link_type"] == LinkType.SUPPORT.value:
            from_opinion.supports.disconnect(to_opinion)
        elif link_info["link_type"] == LinkType.OPPOSE.value:
            from_opinion.opposes.disconnect(to_opinion)
        # Create a new OR opinion
        new_or_opinion_id = create_or_opinion(
            content=f"{from_opinion.content} -> {to_opinion.content}",
            creator="system",
            host=from_opinion.host,
            positive_score=1.0,
            debate_id=debate_id,
        )
        # Create an AND opinion from the original link
        new_and_opinion_id = create_and_opinion(
            parent_id=to_opinion.uid,
            son_ids=[new_or_opinion_id, from_opinion.uid],
            link_type=LinkType.SUPPORT,
            creator="system",
            host=from_opinion.host,
            debate_id=debate_id,
        )
        # Update scores
        new_and_opinion = OpinionNeo4j.nodes.get(uid=new_and_opinion_id)
        new_and_opinion.positive_score = from_opinion.positive_score
        new_and_opinion.son_positive_score = from_opinion.positive_score
        new_and_opinion.negative_score = from_opinion.negative_score
        new_and_opinion.save()
        return new_or_opinion_id, new_and_opinion_id
    except Exception as e:
        raise RuntimeError(f"Failed to attack link in Neo4j: {str(e)}")
