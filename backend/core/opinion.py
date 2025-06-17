from core.db_life import get_psql_session
from core.debate import cited_in_debate
from schemas.db.neo4j import Opinion as OpinionNeo4j
from schemas.db.psql import Opinion as OpinionPsql, model2dict
from schemas.opinion import LogicType
from core import update_score


def create_opinion(
    content: str,
    creator: str,
    host: str = "local",
    node_type: str = "solid",
    logic_type: LogicType = LogicType.OR,
    positive_score: float | None = None,
    debate_id: str | None = None,
) -> str:
    """
    Create a new opinion with the given parameters.

    :param content: The content of the opinion.
    :param creator: The ID of the user creating the opinion.
    :param host: The ID of the host (local or external) associated with the opinion.
    :param node_type: The type of the node (solid or empty).
    :param logic_type: The logic type for the opinion (default is "or").
    :param positive_score: Optional initial positive score for the opinion.
    :param debate_id: Optional ID of the debate this opinion belongs to.
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
        )
        if logic_type:
            new_opinion_neo4j.logic_type = logic_type.value  # type: ignore
        if positive_score:
            new_opinion_neo4j.positive_score = positive_score  # type: ignore
        new_opinion_neo4j.save()
    except Exception as e:
        raise RuntimeError(f"Failed to create opinion in Neo4j: {str(e)}")

    # Link the opinion to the debate if debate_id is provided
    if debate_id:
        try:
            cited_in_debate(debate_id, str(new_opinion_psql.id))
        except Exception as e:
            raise RuntimeError(
                f"Failed to link opinion to debate in PostgreSQL: {str(e)}"
            )

    return str(new_opinion_psql.id)


def delete_opinion(opinion_id: str, debate_id: str | None = None):
    """
    Delete an opinion by its ID.

    :param opinion_id: The ID of the opinion to delete.
    :param debate_id: Optional ID of the debate this opinion belongs to.
    """
    with get_psql_session() as psql_session:
        opinion = psql_session.query(OpinionPsql).filter_by(id=opinion_id).first()
        if not opinion:
            raise ValueError(f"Opinion with ID {opinion_id} not found in PostgreSQL.")

        if not debate_id:
            # If no debate_id is provided, delete the opinion from all debates
            try:
                psql_session.delete(opinion)
                psql_session.commit()
            except Exception as e:
                psql_session.rollback()
                raise RuntimeError(f"Failed to delete opinion in PostgreSQL: {str(e)}")
            try:
                opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)
                father_opinions = opinion_neo4j.supported_by + opinion_neo4j.opposed_by
                # Update positive score to None before deleting
                opinion_neo4j.positive_score = None
                update_score.update_node_score_positively_from(opinion_id)
                # Delete the opinion in Neo4j
                opinion_neo4j.delete()
                # Update negative scores of father opinions
                for father_opinion in father_opinions:
                    update_score.update_node_score_negatively_recursively(father_opinion.uid, None)
            except Exception as e:
                raise RuntimeError(f"Failed to delete opinion in Neo4j: {str(e)}")
        else:
            # If a debate_id is provided, only delete the opinion in the debate
            try:
                opinion.debates.remove(debate_id)
                psql_session.commit()
            except Exception as e:
                psql_session.rollback()
                raise RuntimeError(
                    f"Failed to remove opinion from debate in PostgreSQL: {str(e)}"
                )


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
                        "positive": opinion_neo4j.positive_score,
                        "negative": opinion_neo4j.negative_score,
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
                    opinion_id_in_debate = (
                        str(row[0])
                        for row in psql_session.query(OpinionPsql.id)
                        .filter(OpinionPsql.debates.any(id=debate_id))
                        .all()
                    )
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
) -> list[dict]:
    """
    Query opinions based on content, debate ID, or opinion ID.

    :param q: Optional search query string to filter opinions by content.
    :param debate_id: Optional related_opinionsID of the debate to filter opinions by.
    :param min_score: Optional minimum score to filter opinions by.
    :param max_score: Optional maximum score to filter opinions by.
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
        if debate_id:
            with get_psql_session() as psql_session:
                opinion_ids = [
                    op_id
                    for op_id in opinion_ids
                    if psql_session.query(OpinionPsql.id)
                    .filter(
                        OpinionPsql.id == op_id, OpinionPsql.debates.any(id=debate_id)
                    )
                    .first()
                ]

        opinions = []
        for opinion_id in opinion_ids:
            opinion_info = info_opinion(opinion_id, debate_id, False)
            opinions.append(opinion_info)
        return opinions
    except Exception as e:
        raise RuntimeError(f"Failed to query opinions from Neo4j: {str(e)}")


def patch_opinion(
    opinion_id: str,
    content: str | None = None,
    positive_score: float | None = None,
    is_llm_score: bool = False,
    creator: str | None = None,
):
    """
    Patch an existing opinion with new values.

    :param opinion_id: The ID of the opinion to patch.
    :param content: New content for the opinion.
    :param positive_score: New positive score for the opinion.
    :param is_llm_score: Whether the score is generated by an LLM.
    :param creator: The ID of the user creating the opinion.
    """
    with get_psql_session() as psql_session:

        # Update PostgreSQL
        opinion_psql = psql_session.query(OpinionPsql).filter_by(id=opinion_id).first()
        if not opinion_psql:
            raise ValueError(f"Opinion with ID {opinion_id} not found in PostgreSQL.")

        if creator:
            opinion_psql.creator = creator  # type: ignore
            try:
                psql_session.commit()
            except Exception as e:
                psql_session.rollback()
                raise RuntimeError(f"Failed to update creator in PostgreSQL: {str(e)}")

    # Update Neo4j
    try:
        opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)
        if content is not None:
            opinion_neo4j.content = content
        if is_llm_score:
            pass
        if positive_score:
            opinion_neo4j.positive_score = positive_score
            update_score.update_node_score_positively_from(opinion_id, is_refresh=True)
        opinion_neo4j.save()
    except Exception as e:
        raise RuntimeError(f"Failed to update opinion in Neo4j: {str(e)}")
