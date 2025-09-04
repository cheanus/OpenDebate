import re
from openai import OpenAI
from config_private import MODEL, BASE_URL, API_KEY

client = OpenAI(api_key=API_KEY, base_url=BASE_URL)


def llm_chat(prompt: str) -> str:
    """Simple synchronous LLM chat wrapper returning the assistant content as string.

    Expects OpenAI-compatible client available via `openai.OpenAI`.
    This wrapper is intentionally small: it sends a system prompt and the user prompt,
    and returns the assistant text. Errors are propagated to caller.
    """
    global client
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are a helpful assistant.",
            },
            {"role": "user", "content": prompt},
        ],
        stream=False,
    )
    content = resp.choices[0].message.content
    if not content:
        raise RuntimeError("Empty response from LLM")
    return content.strip()


def llm_score(text: str) -> float | None:
    """Score the input text between 0 and 1 using an LLM.

    The prompt is designed to make the LLM return a single float number between 0 and 1.
    """
    prompt = (
        "在0到1的范围内评分，其中0表示完全不合理，1表示完全合理。"
        "请对以下陈述进行合理性评分，提供一个介于0到1之间的浮点数，将答案放在<answer></answer>两个tag中。\n\n"
        f"陈述：{text}"
    )
    response = llm_chat(prompt)
    match = re.search(r"<answer>(.*?)</answer>", response, re.DOTALL)
    try:
        if not match:
            return None
        score = float(match.group(1).strip())
        if score < 0 or score > 1:
            return None
        return score
    except:
        return None


def is_OR_link_reasonable(from_content: str, to_content: str, link_type: str) -> bool:
    """Check if a link between two opinions is reasonable using an LLM.

    The prompt is designed to make the LLM return "是" or "否".
    """
    prompt = (
        "请用批判性思维判断观点1与观点2的关系是否合理。\n\n"
        f"观点1：{from_content}\n"
        f"观点2：{to_content}\n"
        f"关系类型：{link_type}\n\n"
        "如果是支持关系，观点1必须完全蕴含观点2，反之亦然。"
        "如果关系合理，请回答“是”；如果不合理，请回答“否”，将答案放在<answer></answer>两个tag中。\n\n"
    )
    response = llm_chat(prompt)
    match = re.search(r"<answer>(.*?)</answer>", response, re.DOTALL)
    if not match:
        return False
    answer = match.group(1).strip()
    return answer == "是"


def is_AND_link_reasonable(from_contents: list[str], to_content: str, link_type: str) -> bool:
    """Check if an AND link between multiple opinions and one opinion is reasonable using an LLM.

    The prompt is designed to make the LLM return "是" or "否".
    """
    from_text = "\n".join([f"观点{i+1}：{content}" for i, content in enumerate(from_contents)])
    prompt = (
        "请用批判性思维判断多个观点与一个结论观点的关系是否合理。\n\n"
        f"{from_text}\n"
        f"结论观点：{to_content}\n"
        f"关系类型：{link_type}\n\n"
        "如果是支持关系，所有前提观点必须共同蕴含结论观点，反之亦然。"
        "如果关系合理，请回答“是”；如果不合理，请回答“否”，将答案放在<answer></answer>两个tag中。\n\n"
    )
    response = llm_chat(prompt)
    match = re.search(r"<answer>(.*?)</answer>", response, re.DOTALL)
    if not match:
        return False
    answer = match.group(1).strip()
    return answer == "是"
