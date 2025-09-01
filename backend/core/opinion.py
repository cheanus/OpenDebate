from core.db_life import get_psql_session
from core.debate import cited_in_debate
from core.debate import get_global_debate
from schemas.db.neo4j import Opinion as OpinionNeo4j
from schemas.db.psql import Opinion as OpinionPsql, Debate as DebatePsql, model2dict
from schemas.opinion import LogicType
from schemas.link import LinkType
from core import update_score


def create_or_opinion(
    content: str,
    creator: str,
    debate_id: str,
    host: str = "local",
    node_type: str = "solid",
    positive_score: float | None = None,
) -> str:
    """
    Create a new OR opinion with the given parameters.

    :param content: The content of the opinion.
    :param creator: The ID of the user creating the opinion.
    :param debate_id: ID of the debate this opinion belongs to.
    :param host: The ID of the host (local or external) associated with the opinion.
    :param node_type: The type of the node (solid or empty).
    :param positive_score: Optional initial positive score for the opinion.
    :return: The ID of the created opinion or a success message.
    """
    with get_psql_session() as psql_session:
        try:
            new_opinion_psql = OpinionPsql(creator=creator)
            psql_session.add(new_opinion_psql)
            psql_session.commit()
            psql_session.refresh(new_opinion_psql)
        except Exception as e:
            psql_session.rollback()
            raise RuntimeError(f"Failed to create opinion in PostgreSQL: {str(e)}")

    try:
        new_opinion_neo4j = OpinionNeo4j(
            uid=new_opinion_psql.id,
            content=content,
            host=host,
            node_type=node_type,
            logic_type=LogicType.OR.value,
        )
        if positive_score:
            new_opinion_neo4j.positive_score = positive_score  # type: ignore
        new_opinion_neo4j.save()
    except Exception as e:
        raise RuntimeError(f"Failed to create opinion in Neo4j: {str(e)}")

    # Link the opinion to the debate
    try:
        cited_in_debate(debate_id, str(new_opinion_psql.id))
        global_debate_id = get_global_debate()
        # Also link to the global debate
        if global_debate_id and debate_id != global_debate_id:
            cited_in_debate(global_debate_id, str(new_opinion_psql.id))
    except Exception as e:
        raise RuntimeError(f"Failed to link opinion to debate in PostgreSQL: {str(e)}")

    return str(new_opinion_psql.id)


def create_and_opinion(
    parent_id: str,
    son_ids: list[str],
    link_type: LinkType,
    creator: str,
    debate_id: str,
    intermediate: bool = False,
    host: str = "local",
) -> tuple[str, list[str], dict[str, dict[str, float | None]]]:
    """
    Create a new AND opinion with the given parameters.

    :param parent_id: The ID of the parent opinion.
    :param son_ids: List of IDs of the child opinions that this AND opinion will link to.
    :param link_type: The type of link to create between the opinion and the parent opinion.
    :param creator: The ID of the user creating the opinion.
    :param debate_id: ID of the debate this opinion belongs to.
    :param intermediate: Whether the opinion is an intermediate node.
    :param host: The ID of the host (local or external) associated with the opinion.
    :return: The ID of the created opinion or a success message, and a dictionary of updated IDs and their new scores.
    """
    with get_psql_session() as psql_session:
        try:
            new_opinion_psql = OpinionPsql(creator=creator)
            psql_session.add(new_opinion_psql)
            psql_session.commit()
            psql_session.refresh(new_opinion_psql)
        except Exception as e:
            psql_session.rollback()
            raise RuntimeError(f"Failed to create opinion in PostgreSQL: {str(e)}")

    links_ids: list[str] = []
    try:
        # Firstly check if son opinions are not empty
        son_opinion_neo4j_list = []
        for son_id in son_ids:
            son_opinion_neo4j = OpinionNeo4j.nodes.get(uid=son_id)
            if son_opinion_neo4j.node_type == "empty":
                raise ValueError(f"Son opinion {son_id} is empty.")
            son_opinion_neo4j_list.append(son_opinion_neo4j)
        # Then check if parent opinion are not empty
        parent_opinion_neo4j = OpinionNeo4j.nodes.get(uid=parent_id)
        if parent_opinion_neo4j.node_type == "empty":
            raise ValueError(f"Parent opinion {parent_id} is empty.")
        # Create the new opinion node
        new_opinion_neo4j = OpinionNeo4j(
            uid=new_opinion_psql.id,
            content="与" if link_type == LinkType.SUPPORT else "与非",
            host=host,
            node_type="empty",
            logic_type=LogicType.AND.value,
            intermediate=intermediate,
        )
        new_opinion_neo4j.save()
        # Link the new AND opinion to the parent opinion
        if link_type == LinkType.SUPPORT:
            new_opinion_neo4j.supports.connect(parent_opinion_neo4j)  # type: ignore
            rel = new_opinion_neo4j.supports.relationship(parent_opinion_neo4j)  # type: ignore
        elif link_type == LinkType.OPPOSE:
            new_opinion_neo4j.opposes.connect(parent_opinion_neo4j)  # type: ignore
            rel = new_opinion_neo4j.opposes.relationship(parent_opinion_neo4j)  # type: ignore
        else:
            raise ValueError(f"Unsupported link type: {link_type}")
        links_ids.append(rel.uid)
        # Link the new AND opinion to the child opinions
        for son_opinion_neo4j in son_opinion_neo4j_list:
            son_opinion_neo4j.supports.connect(new_opinion_neo4j)
            rel_son = son_opinion_neo4j.supports.relationship(new_opinion_neo4j)
            links_ids.append(rel_son.uid)
        updated_nodes: dict[str, dict[str, float | None]] = {}
        # Update score
        update_score.refresh_son_type_score(
            str(new_opinion_neo4j.uid), "positive", updated_nodes
        )
        new_opinion_neo4j = OpinionNeo4j.nodes.get(uid=new_opinion_neo4j.uid)
        new_opinion_neo4j.positive_score = new_opinion_neo4j.son_positive_score
        new_opinion_neo4j.save()
        update_score.update_node_score_positively_from(
            str(new_opinion_psql.id), updated_nodes
        )
        ## No need to update negative score here, as it will be updated in update_node_score_positively_from above
        ## And here new_opinion_neo4j.negative_score is None by default
    except Exception as e:
        raise RuntimeError(f"Failed to create opinion in Neo4j: {str(e)}")

    # Link the opinion to the debate
    try:
        cited_in_debate(debate_id, str(new_opinion_psql.id))
        global_debate_id = get_global_debate()
        # Also link to the global debate
        if global_debate_id and debate_id != global_debate_id:
            cited_in_debate(global_debate_id, str(new_opinion_psql.id))
    except Exception as e:
        raise RuntimeError(f"Failed to link opinion to debate in PostgreSQL: {str(e)}")

    return str(new_opinion_psql.id), links_ids, updated_nodes


def delete_opinion(opinion_id: str, debate_id: str) -> dict[str, float | None]:
    """
    Delete an opinion by its ID.

    :param opinion_id: The ID of the opinion to delete.
    :param debate_id: ID of the debate this opinion belongs to.
    :return: A dictionary of updated IDs and their new scores.
    """
    updated_nodes = dict()
    with get_psql_session() as psql_session:
        opinion = psql_session.query(OpinionPsql).filter_by(id=opinion_id).first()
        if not opinion:
            raise ValueError(f"Opinion with ID {opinion_id} not found in PostgreSQL.")

        if debate_id == get_global_debate():
            # If no debate_id is provided, delete the opinion from all debates
            try:
                psql_session.delete(opinion)
                psql_session.commit()
            except Exception as e:
                psql_session.rollback()
                raise RuntimeError(f"Failed to delete opinion in PostgreSQL: {str(e)}")
            try:
                opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)
                son_opinions = (
                    opinion_neo4j.supported_by.all() + opinion_neo4j.opposed_by.all()
                )
                # Update positive score to None before deleting
                opinion_neo4j.positive_score = None
                opinion_neo4j.save()
                update_score.update_node_score_positively_from(
                    opinion_id, updated_nodes, is_refresh=True
                )
                # Delete the opinion in Neo4j
                opinion_neo4j.delete()
                # Update negative scores of son opinions
                for son_opinion in son_opinions:
                    update_score.update_node_score_negatively_recursively(
                        son_opinion.uid, updated_nodes, None
                    )
            except Exception as e:
                raise RuntimeError(f"Failed to delete opinion in Neo4j: {str(e)}")
        else:
            # If a debate_id is provided, only delete the opinion in the debate
            try:
                debate = psql_session.query(DebatePsql).filter_by(id=debate_id).first()
                if not debate:
                    raise ValueError(
                        f"Debate with ID {debate_id} not found in PostgreSQL."
                    )
                if debate in opinion.debates:
                    opinion.debates.remove(debate)
                    psql_session.commit()
            except Exception as e:
                psql_session.rollback()
                raise RuntimeError(
                    f"Failed to remove opinion from debate in PostgreSQL: {str(e)}"
                )
    if opinion_id in updated_nodes:
        del updated_nodes[opinion_id]
    return updated_nodes


def info_opinion(
    opinion_id: str,
    debate_id: str | None = None,
    has_relationship: bool = True,
    is_get_relationship_id: bool = True,
) -> dict:
    """
    Get information about an opinion by its ID.

    :param opinion_id: The ID of the opinion to retrieve.
    :param debate_id: Optional ID of the debate the info should be filtered by.
    :param has_relationship: Whether to include related opinions in the response.
    :param is_get_relationship_id: Whether to return the IDs of relationships or the full objects.
    :return: A dictionary containing the opinion details.
    """
    # Get information from postgreSQL
    with get_psql_session() as psql_session:
        query = psql_session.query(OpinionPsql).filter_by(id=opinion_id)
        opinion_psql = query.first()
        if not opinion_psql:
            raise ValueError(f"Opinion with ID {opinion_id} not found in PostgreSQL.")

        infos = model2dict(opinion_psql)

        # Get information from Neo4j
        try:
            opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)
            infos.update(
                {
                    "content": opinion_neo4j.content,
                    "host": opinion_neo4j.host,
                    "logic_type": opinion_neo4j.logic_type,
                    "node_type": opinion_neo4j.node_type,
                    "score": {
                        "positive": (
                            round(opinion_neo4j.positive_score, 2)
                            if opinion_neo4j.positive_score
                            else None
                        ),
                        "negative": (
                            round(opinion_neo4j.negative_score, 2)
                            if opinion_neo4j.negative_score
                            else None
                        ),
                    },
                }
            )
        except Exception as e:
            raise RuntimeError(f"Failed to retrieve opinion from Neo4j: {str(e)}")

        if has_relationship:
            # Get related opinions and classify them by link type
            relationship = {
                "supports": [],
                "opposes": [],
                "supported_by": [],
                "opposed_by": [],
            }
            try:
                if debate_id:
                    opinion_id_in_debate = {
                        str(row[0])
                        for row in psql_session.query(OpinionPsql.id)
                        .filter(OpinionPsql.debates.any(id=debate_id))
                        .all()
                    }
                else:
                    opinion_id_in_debate = {
                        str(row[0]) for row in psql_session.query(OpinionPsql.id).all()
                    }
                for rel_name in ["supports", "opposes", "supported_by", "opposed_by"]:
                    for to_node in getattr(opinion_neo4j, rel_name).all():
                        if to_node.uid in opinion_id_in_debate:
                            if is_get_relationship_id:
                                relationship[rel_name].append(
                                    getattr(opinion_neo4j, rel_name)
                                    .relationship(to_node)
                                    .uid
                                )
                            else:
                                relationship[rel_name].append(to_node.uid)
            except Exception as e:
                raise RuntimeError(
                    f"Failed to retrieve related opinions from Neo4j: {str(e)}"
                )

            infos["relationship"] = relationship

        return infos


def query_opinion(
    q: str | None = None,
    debate_id: str | None = None,
    min_score: float | None = None,
    max_score: float | None = None,
    is_time_accending: bool = True,
    max_num: int = 1,
) -> list[dict]:
    """
    Query opinions based on content, debate ID, or opinion ID.

    :param q: Optional search query string to filter opinions by content.
    :param debate_id: Optional related_opinionsID of the debate to filter opinions by.
    :param min_score: Optional minimum score to filter opinions by.
    :param max_score: Optional maximum score to filter opinions by.
    :param is_time_accending: Whether to sort the results by time in ascending order.
    :param max_num: The maximum number of opinions to return.
    :return: A list of dictionaries containing matching opinions.
    """
    # Get information from Neo4j
    try:
        query = OpinionNeo4j.nodes
        if q:
            query = query.filter(content__contains=q)
        opinions_list = query.all()
        if min_score is not None:
            opinions_list = [
                op
                for op in opinions_list
                if op.positive_score
                and op.negative_score
                and (op.positive_score + op.negative_score) / 2 >= min_score
            ]
        if max_score is not None:
            opinions_list = [
                op
                for op in opinions_list
                if op.positive_score
                and op.negative_score
                and (op.positive_score + op.negative_score) / 2 <= max_score
            ]
        opinion_ids = [opinion.uid for opinion in opinions_list]
        with get_psql_session() as psql_session:
            if debate_id:
                opinion_ids = [
                    op_id
                    for op_id in opinion_ids
                    if psql_session.query(OpinionPsql.id)
                    .filter(
                        OpinionPsql.id == op_id, OpinionPsql.debates.any(id=debate_id)
                    )
                    .first()
                ]
            # 查询所有opinion_id及其created_at
            id_time = (
                psql_session.query(OpinionPsql.id, OpinionPsql.created_at)
                .filter(OpinionPsql.id.in_(opinion_ids))
                .all()
            )
            # 排序
            id_time_sorted = sorted(
                id_time,
                key=lambda x: x[1],
                reverse=not is_time_accending,
            )
            # 只保留排序后的id
            opinion_ids = [str(row[0]) for row in id_time_sorted]
            opinion_ids = opinion_ids[:max_num]

        opinions = []
        for opinion_id in opinion_ids:
            opinion_info = info_opinion(opinion_id, debate_id, False)
            opinions.append(opinion_info)
        return opinions
    except Exception as e:
        raise RuntimeError(f"Failed to query opinions from Neo4j: {str(e)}")


def head_opinion(debate_id: str, is_root: bool) -> list[str]:
    """
    Get leaf or root opinions in a debate.

    :param debate_id: ID of the debate to filter head opinions by.
    :param is_root: If True, return root opinions; if False, return leaf opinions.
    :return: A list of head opinion IDs.
    """
    try:
        # Get all opinions from psql if debate_id is provided
        with get_psql_session() as psql_session:
            opinion_ids = [
                str(row[0])
                for row in psql_session.query(OpinionPsql.id)
                .filter(OpinionPsql.debates.any(id=debate_id))
                .all()
            ]
        # Get head opinions from Neo4j
        head_ids = []
        for oid in opinion_ids:
            try:
                op = OpinionNeo4j.nodes.get(uid=oid)
                if is_root:
                    # 没有任何 supports 和 opposes 关系的节点为根节点
                    if not op.supports.all() and not op.opposes.all():
                        head_ids.append(oid)
                else:
                    # 没有任何 supported_by 和 opposed_by 关系的节点为叶节点
                    if not op.supported_by.all() and not op.opposed_by.all():
                        head_ids.append(oid)
            except Exception:
                continue  # 跳过Neo4j中不存在的节点
        return head_ids
    except Exception as e:
        raise RuntimeError(f"Failed to get head opinions: {str(e)}")


def patch_opinion(
    opinion_id: str,
    content: str | None = None,
    score: dict[str, float | None] | None = None,
    is_llm_score: bool = False,
    creator: str | None = None,
) -> dict[str, float | None]:
    """
    Patch an existing opinion with new values.

    :param opinion_id: The ID of the opinion to patch.
    :param content: New content for the opinion.
    :param score: A dictionary containing a new score for the opinion.
        It can only contain "positive" key with its score.
    :param is_llm_score: Whether the score is generated by an LLM.
    :param creator: The ID of the user creating the opinion.
    :return: A dictionary of updated IDs and their new scores.
    """
    try:
        # Update PostgreSQL
        with get_psql_session() as psql_session:
            opinion_psql = (
                psql_session.query(OpinionPsql).filter_by(id=opinion_id).first()
            )
            if not opinion_psql:
                raise ValueError(
                    f"Opinion with ID {opinion_id} not found in PostgreSQL."
                )

            if creator:
                opinion_psql.creator = creator  # type: ignore
                try:
                    psql_session.commit()
                except Exception as e:
                    psql_session.rollback()
                    raise RuntimeError(
                        f"Failed to update creator in PostgreSQL: {str(e)}"
                    )

        # Update Neo4j
        op_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)
        if content is not None:
            op_neo4j.content = content

        is_leaf = False
        if not op_neo4j.supported_by.all() and not op_neo4j.opposed_by.all():
            is_leaf = True
        if is_llm_score:
            if not is_leaf:
                raise RuntimeError(f"Opinion with ID {op_neo4j.uid} is not leaf node.")
            pass

        updated_nodes = dict()
        if score and "positive" in score:  # None也是信号
            if not is_leaf:
                raise RuntimeError(f"Opinion with ID {op_neo4j.uid} is not leaf node.")
            op_neo4j.positive_score = score["positive"]
            op_neo4j.save()
            updated_nodes.setdefault(opinion_id, {})["positive"] = score["positive"]
            update_score.update_node_score_positively_from(
                opinion_id, updated_nodes, is_refresh=True
            )
        op_neo4j.save()
        return updated_nodes
    except Exception as e:
        raise RuntimeError(f"Failed to update opinion in Neo4j: {str(e)}")
