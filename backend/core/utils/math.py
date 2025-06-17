def avg_of_list(numbers: list[float | None]) -> float | None:
    """
    Calculate the average of a list of numbers and ignore None values.

    Args:
        numbers (list[float | None]): A list of numbers.

    Returns:
        float | None: The average of the numbers in the list.
    """
    if not numbers:
        return None
    valid_numbers = [num for num in numbers if num is not None]
    if not valid_numbers or len(valid_numbers) == 0:
        return None
    return sum(valid_numbers) / len(valid_numbers)


def revert_score(score: float | None) -> float | None:
    """
    Revert a score to its opposite value.

    Args:
        score (float | None): The score to revert.

    Returns:
        float | None: The reverted score.
    """
    if score is None:
        return None
    return 1 - score


def min_of_list(numbers: list[float | None]) -> float | None:
    """
    Calculate the minimum of a list of numbers and ignore None values.

    Args:
        numbers (list[float | None]): A list of numbers.

    Returns:
        float | None: The minimum of the numbers in the list.
    """
    valid_numbers = [num for num in numbers if num is not None]
    if not valid_numbers or len(valid_numbers) == 0:
        return None
    return min(valid_numbers)
