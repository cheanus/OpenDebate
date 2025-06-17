from neomodel import db
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


def delete_link(link_id: str):
    """
    Delete a link in the Neo4j database.

    :param link_id: The ID of the link to delete.
    """
    try:
        info = info_link(link_id)
        # After deletion, update the scores of the related nodes
        from_opinion = OpinionNeo4j.nodes.get(uid=info["from_id"])
        to_opinion = OpinionNeo4j.nodes.get(uid=info["to_id"])
        from_opinion.supports.disconnect(to_opinion)
        if info["link_type"] == LinkType.SUPPORT.value:
            update_score.update_node_score_positively_recursively(info["to_id"], {"positive": None})
        elif info["link_type"] == LinkType.OPPOSE.value:
            update_score.update_node_score_positively_recursively(info["to_id"], {"negative": None})
        update_score.update_node_score_negatively_recursively(info["from_id"], new_score=None)
    except Exception as e:
        raise RuntimeError(f"Failed to delete link in Neo4j: {str(e)}")


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

        # 删除原关系
        delete_query = """
        MATCH (:Opinion)-[r]->(:Opinion)
        WHERE r.uid = $uid
        DELETE r
        """
        db.cypher_query(delete_query, {"uid": link_id})

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
