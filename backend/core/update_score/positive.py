from schemas.db.neo4j import Opinion as OpinionNeo4j
from schemas.opinion import ScoreType
from core.utils.math import avg_of_list, revert_score
from .negative import update_node_score_negatively


def update_node_score_positively_from(opinion_id: str, is_refresh: bool = False):
    """
    Update the scores of related nodes positively.

    Args:
        opinion_id (str): The ID of the root node to update.
        is_refresh (bool): If True, the scores of son nodes will be refreshed.
    """
    opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)

    new_positive_score = opinion_neo4j.positive_score
    if is_refresh:
        new_positive_score = None

    for related_opinion in opinion_neo4j.supports:
        update_node_score_positively_recursively(
            related_opinion.uid,
            {"positive": new_positive_score},
        )
    for related_opinion in opinion_neo4j.opposes:
        update_node_score_positively_recursively(
            related_opinion.uid,
            {"negative": new_positive_score},
        )


# 应考虑到None值也可作为传播更新源
def update_node_score_positively_recursively(
    opinion_id: str,
    new_score: dict[str, float | None],
):
    """
    Recursively update the scores of a node positively.

    Args:
        opinion_id (str): The ID of the root node to update.
        new_score (dict[str, float | None]): A dictionary containing the new scores.
            It can contain "positive" and/or "negative" keys with their respective scores.
    """
    opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)
    new_positive_score = new_score.get(ScoreType.POSITIVE, None)
    new_negative_score = new_score.get(ScoreType.NEGATIVE, None)
    is_updated = False
    if (
        not new_positive_score
        and not opinion_neo4j.son_positive_score
        and not new_negative_score
        and not opinion_neo4j.son_negative_score
    ):
        # End updating because they are both None
        return

    # Update the con negative score
    if "negative" in new_score:
        if new_negative_score is None:
            is_updated |= refresh_son_type_score(opinion_id, score_type="negative")
        elif (
            opinion_neo4j.son_negative_score is None
            or new_negative_score > opinion_neo4j.son_negative_score
        ):
            is_updated = True
            opinion_neo4j.son_negative_score = new_negative_score

    # Update the con positive score
    if "positive" in new_score:
        if new_positive_score is None:
            is_updated |= refresh_son_type_score(opinion_id, score_type="positive")
        elif (
            opinion_neo4j.son_positive_score is None
            or opinion_neo4j.logic_type == "or"
            and new_positive_score > opinion_neo4j.son_positive_score
            or opinion_neo4j.logic_type == "and"
            and new_positive_score < opinion_neo4j.son_positive_score
        ):
            is_updated = True
            opinion_neo4j.son_positive_score = new_positive_score

    if is_updated:
        # calculate the new score and update related opinions
        next_new_score = avg_of_list(
            [
                opinion_neo4j.son_positive_score,
                revert_score(opinion_neo4j.son_negative_score),
            ]
        )
        opinion_neo4j.positive_score = next_new_score
        opinion_neo4j.save()
        # Update the related node scores
        for related_opinion in opinion_neo4j.supports:
            update_node_score_positively_recursively(
                related_opinion.uid,
                {"positive": next_new_score},
            )
        for related_opinion in opinion_neo4j.opposes:
            update_node_score_positively_recursively(
                related_opinion.uid,
                {"negative": next_new_score},
            )
        # Update score negatively
        update_node_score_negatively(opinion_id)


def refresh_son_type_score(opinion_id: str, score_type: str) -> bool:
    """
    Refresh the son_score of a node based on its related nodes.
    Args:
        opinion_id (str): The ID of the node to refresh.
        score_type (str): The type of score to refresh, either "positive" or "negative".
    Returns:
        bool: True if the score was updated, False otherwise.
    """
    opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)
    is_updated = False

    if score_type == "positive":
        con_positive_score = avg_of_list(
            [
                related_opinion.positive_score
                for related_opinion in opinion_neo4j.supported_by
            ]
        )
        if opinion_neo4j.son_positive_score is None and con_positive_score is None:
            return False
        if (
            not opinion_neo4j.son_positive_score
            or not con_positive_score
            or abs(opinion_neo4j.son_positive_score - con_positive_score) > 1e-6
        ):
            is_updated = True
            opinion_neo4j.son_positive_score = con_positive_score
    elif score_type == "negative":
        con_negative_score = avg_of_list(
            [
                related_opinion.positive_score
                for related_opinion in opinion_neo4j.opposed_by
            ]
        )
        if opinion_neo4j.son_negative_score is None and con_negative_score is None:
            return False
        if (
            not opinion_neo4j.son_negative_score
            or not con_negative_score
            or abs(opinion_neo4j.son_negative_score - con_negative_score) > 1e-6
        ):
            is_updated = True
            opinion_neo4j.son_negative_score = con_negative_score
    else:
        raise ValueError("score_type must be 'positive' or 'negative'")
    opinion_neo4j.save()
    return is_updated
