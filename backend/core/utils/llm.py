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
