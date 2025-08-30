from schemas.db.neo4j import Opinion as OpinionNeo4j
from schemas.opinion import ScoreType
from core.utils.math import avg_of_list, revert_score, is_same
from .negative import (
    update_node_score_negatively,
    update_node_score_negatively_recursively,
)


def update_node_score_positively_from(
    opinion_id: str,
    updated_nodes: dict[str, dict[str, float | None]],
    is_refresh: bool = False,
):
    """
    Update the scores of related nodes positively.

    Args:
        opinion_id (str): The ID of the root node to update.
        updated_nodes (dict[str, dict[str, float | None]]): A dictionary to keep track of updated node IDs and their new scores.
        is_refresh (bool): If True, the scores of parent nodes will be refreshed.
    """
    opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)

    new_positive_score = opinion_neo4j.positive_score

    # 向上游传播
    for related_opinion in opinion_neo4j.supports:
        update_node_score_positively_recursively(
            related_opinion.uid,
            {"positive": new_positive_score},
            updated_nodes,
            is_refresh=is_refresh,
        )
    for related_opinion in opinion_neo4j.opposes:
        update_node_score_positively_recursively(
            related_opinion.uid,
            {"negative": new_positive_score},
            updated_nodes,
            is_refresh=is_refresh,
        )


# 应考虑到None值也可作为传播更新源
def update_node_score_positively_recursively(
    opinion_id: str,
    new_score: dict[str, float | None],
    updated_nodes: dict[str, dict[str, float | None]],
    is_refresh: bool = False,
):
    """
    Recursively update the scores of a node positively.

    Args:
        opinion_id (str): The ID of the root node to update.
        new_score (dict[str, float | None]): A dictionary containing the new scores.
            It can contain "positive" and/or "negative" keys with their respective scores.
        updated_nodes (dict[str, dict[str, float | None]]): A dictionary to keep track of updated node IDs and their new scores.
        is_refresh (bool): If True, the scores of parent nodes will be refreshed.
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
        if is_refresh or new_negative_score is None:
            # 触发子分数刷新
            is_updated |= refresh_son_type_score(
                opinion_id, score_type="negative", updated_nodes=updated_nodes
            )
        elif (
            opinion_neo4j.son_negative_score is None
            or new_negative_score > opinion_neo4j.son_negative_score
        ):  # negative 关系只能是 or 关系
            is_updated = True
            opinion_neo4j.son_negative_score = new_negative_score
            opinion_neo4j.save()

    # Update the con positive score
    if "positive" in new_score:
        if is_refresh or new_positive_score is None:
            # 触发子分数刷新
            is_updated |= refresh_son_type_score(
                opinion_id, score_type="positive", updated_nodes=updated_nodes
            )
        elif (
            opinion_neo4j.son_positive_score is None
            or opinion_neo4j.logic_type == "or"
            and new_positive_score > opinion_neo4j.son_positive_score
            or opinion_neo4j.logic_type == "and"
            and new_positive_score < opinion_neo4j.son_positive_score
        ):
            # AND点要考虑已受传播的反证分需被删除，例如新增了一个更小的正证分
            remove_old_negative_score(opinion_neo4j, new_positive_score, updated_nodes)

            is_updated = True
            opinion_neo4j.son_positive_score = new_positive_score
            opinion_neo4j.save()

    if is_updated:
        # Recalculate the positive score
        opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)
        # calculate the new score and update related opinions
        next_new_score = avg_of_list(
            [
                opinion_neo4j.son_positive_score,
                revert_score(opinion_neo4j.son_negative_score),
            ]
        )
        old_positive_score = opinion_neo4j.positive_score
        opinion_neo4j.positive_score = next_new_score
        opinion_neo4j.save()
        updated_nodes.setdefault(opinion_id, {})["positive"] = next_new_score  # 记录被更新的节点
        # Update the related node scores
        for related_opinion in opinion_neo4j.supports:
            update_node_score_positively_recursively(
                related_opinion.uid,
                {"positive": next_new_score},
                updated_nodes,
                is_refresh=is_same(
                    old_positive_score, related_opinion.son_positive_score
                ),  # 需考虑本节点旧分数为父节点提供了son分数的情况，下同
            )
        for related_opinion in opinion_neo4j.opposes:
            update_node_score_positively_recursively(
                related_opinion.uid,
                {"negative": next_new_score},
                updated_nodes,
                is_refresh=is_same(
                    old_positive_score, related_opinion.son_negative_score
                ),
            )
        # Update score negatively
        ## 没必要是update_node_score_negatively_from，想想迭代的尾点
        update_node_score_negatively(opinion_id, updated_nodes)


def refresh_son_type_score(
    opinion_id: str,
    score_type: str,
    updated_nodes: dict[str, dict[str, float | None]],
) -> bool:
    """
    Refresh the son_score of a node based on its related nodes.
    Args:
        opinion_id (str): The ID of the node to refresh.
        score_type (str): The type of score to refresh, either "positive" or "negative".
        updated_nodes (dict[str, dict[str, float | None]]): A dictionary to keep track of updated node IDs and their new scores.
    Returns:
        bool: True if the score was updated, False otherwise.
    """

    def logic_score_of_list(
        numbers: list[float | None], logic_type: str
    ) -> float | None:
        """Calculate the logic score of a list of numbers."""
        numbers = [num for num in numbers if num is not None]
        if not numbers:
            return None
        if logic_type == "or":
            return max(numbers)  # type: ignore
        elif logic_type == "and":
            return min(numbers)  # type: ignore
        else:
            raise ValueError("logic_type must be 'or' or 'and'")

    opinion_neo4j = OpinionNeo4j.nodes.get(uid=opinion_id)
    is_updated = False

    if score_type == "positive":
        # Calculate the con positive score
        con_positive_score = logic_score_of_list(
            [
                related_opinion.positive_score
                for related_opinion in opinion_neo4j.supported_by
            ],
            opinion_neo4j.logic_type,
        )
        # If both are None, no need to update
        if opinion_neo4j.son_positive_score is None and con_positive_score is None:
            return False
        # 不相同，则更新
        if not is_same(opinion_neo4j.son_positive_score, con_positive_score):
            # 把原有的小分拉高了，或者为None了，也要删除其反证分
            ## 删除旧反证分和显式更新反证分要放在本文件中，negative.py不管这事
            if (
                opinion_neo4j.son_positive_score
                and con_positive_score
                and con_positive_score > opinion_neo4j.son_positive_score
            ):
                remove_old_negative_score(
                    opinion_neo4j, con_positive_score, updated_nodes
                )
            is_updated = True
            opinion_neo4j.son_positive_score = con_positive_score
    elif score_type == "negative":
        # Calculate the con negative score
        con_negative_score = logic_score_of_list(
            [
                related_opinion.positive_score
                for related_opinion in opinion_neo4j.opposed_by
            ],
            "or",
        )
        # If both are None, no need to update
        if opinion_neo4j.son_negative_score is None and con_negative_score is None:
            return False
        # 不相同，则更新
        if not is_same(opinion_neo4j.son_negative_score, con_negative_score):
            is_updated = True
            opinion_neo4j.son_negative_score = con_negative_score
    else:
        raise ValueError("score_type must be 'positive' or 'negative'")
    opinion_neo4j.save()
    return is_updated


def remove_old_negative_score(
    opinion_neo4j,
    con_positive_score: float | None,
    updated_nodes: dict[str, dict[str, float | None]],
):
    """
    Remove the old negative score of a node and update related nodes.

    Args:
        opinion_neo4j (OpinionNeo4j): The node to update.
        con_positive_score (float | None): The new con positive score.
        updated_nodes (dict[str, dict[str, float | None]]): A dictionary to keep track of updated node IDs and their new scores.
    """
    # 仅针对 AND 节点，因而其与子节点的关系只能是支持
    if opinion_neo4j.logic_type == "and":
        # 先删除旧的反证分
        old_min_opinions = opinion_neo4j.supported_by.filter(
            positive_score=opinion_neo4j.son_positive_score,
        ).all()
        for min_opinion in old_min_opinions:
            update_node_score_negatively_recursively(
                min_opinion.uid,
                updated_nodes,
                None,
            )
        # 再马上更新新的反证分
        new_min_opinions = opinion_neo4j.supported_by.filter(
            positive_score=con_positive_score,
        ).all()
        for related_opinion in new_min_opinions:
            update_node_score_negatively_recursively(
                related_opinion.uid,
                updated_nodes,
                opinion_neo4j.negative_score,
            )
