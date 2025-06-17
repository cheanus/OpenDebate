from schemas.db.neo4j import Opinion as OpinionNeo4j
from core.utils.math import min_of_list, revert_score


def update_node_score_negatively_from(opinion_id: str):
    """
    Update the scores of related nodes negatively.

    Args:
        opinion_id (str): The ID of the root node to update.
    """
    opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)
    for related_opinion in opinion_neo4j.supports:
        update_node_score_negatively(related_opinion.uid)
    for related_opinion in opinion_neo4j.opposes:
        update_node_score_negatively(related_opinion.uid)


def update_node_score_negatively(opinion_id: str):
    """
    Update the negative scores of all related node negatively.

    Args:
        opinion_id (str): The ID of the son node to update negatively.
    """
    opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)

    # Update the supported_by nodes but only if the logic type is "or"
    if opinion_neo4j.logic_type == "or":
        for related_opinion in opinion_neo4j.supported_by:
            update_node_score_negatively_recursively(
                related_opinion.uid, revert_score(opinion_neo4j.son_negative_score)
            )
    # Update the opposed_by nodes
    for related_opinion in opinion_neo4j.opposed_by:
        update_node_score_negatively_recursively(
            related_opinion.uid, revert_score(opinion_neo4j.son_positive_score)
        )


def update_node_score_negatively_recursively(opinion_id: str, new_score: float | None):
    """
    Recursively update the scores of a node negatively.

    Args:
        opinion_id (str): The ID of the node to update.
        new_score (float | None): The new score to set.
    """
    opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)

    if not new_score and not opinion_neo4j.negative_score:
        return

    if not new_score:
        # Refresh the negative score from related nodes
        score_list = []
        for related_opinion in opinion_neo4j.supports:
            if related_opinion.logic_type == "or":
                score_list.append(related_opinion.negative_score)
                score_list.append(revert_score(related_opinion.son_negative_score))
        for related_opinion in opinion_neo4j.opposes:
            score_list.append(revert_score(related_opinion.negative_score))
            score_list.append(related_opinion.son_positive_score)
        new_score = min_of_list(score_list)

        if not new_score and not opinion_neo4j.negative_score:
            return

    if (
        not new_score
        or not opinion_neo4j.negative_score
        or opinion_neo4j.negative_score > new_score
    ):
        opinion_neo4j.negative_score = new_score
        opinion_neo4j.save()
        # Update related opinions
        # Update the supported_by nodes but only if the logic type is "or"
        if opinion_neo4j.logic_type == "or":
            for related_opinion in opinion_neo4j.supported_by:
                update_node_score_negatively_recursively(
                    related_opinion.uid, opinion_neo4j.negative_score
                )
        # Update the opposed_by nodes
        for related_opinion in opinion_neo4j.opposed_by:
            update_node_score_negatively_recursively(
                related_opinion.uid,
                revert_score(opinion_neo4j.negative_score),
            )
