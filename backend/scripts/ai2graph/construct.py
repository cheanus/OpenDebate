from openai import OpenAI
import re
import httpx
import json

DOC_PATH = "/home/test/Documents/个人/辩驳.txt"
BACKEND_URL = "http://localhost:3142/api"
MODEL = "deepseek-chat"
BASE_URL = "https://api.deepseek.com"
API_KEY = "sk-***"


def chat(prompt, client: OpenAI) -> str:
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": prompt},
        ],
        stream=False,
    )

    content = response.choices[0].message.content
    if not content:
        raise ValueError("No content returned from AI model.")
    return content


def ai_struct(doc: str, client: OpenAI) -> tuple[str, str]:
    prompt = (
        "辩论图由多段代码组成，代码间用';'分割，每段代码遵循以下格式：\n"
        "创建id为a1（字母数字组成）的观点，内容为'树好看'：a1:树好看\n"
        "a1观点能演绎出a2观点：a1->a2\n"
        "a1观点能反驳a2，即演绎出a2的否命题：a1->!a2\n"
        "a1或a2观点能演绎出a3观点：a1|a2->a3\n"
        "a1与a2与a3才能演绎出a4观点：a1&a2&a3->a4\n"
        "请根据以下文章创建辩论图标题和代码，以反映其逻辑，用json格式如{'title': 'xx', 'code': 'xx'}输出，"
        "观点内容必须是完整命题，要求逻辑完整、清晰精简：\n"
        f"{doc}\n"
    )
    response = chat(prompt, client)
    print("AI Response:\n", response)
    # 提取标题和代码块
    response = response.strip()
    # 使用json
    try:
        match = re.search(r"\{.*\}", response, re.DOTALL)
        if match is None:
            raise ValueError("Response does not contain valid JSON data.")
        data = json.loads(match.group(0))
        title = data.get("title", "")
        code = data.get("code", "")
        if not title or not code:
            raise ValueError("Response does not contain valid title or code.")
    except json.JSONDecodeError:
        raise ValueError("Response is not valid JSON format.")
    return title, code


def eval_opinion(content: str, client: OpenAI) -> float | None:
    prompt = (
        "请给以下观点内容打分，范围0-1的浮点数，如0.50，将结果输出在<answer></answer>两个tag中：\n"
        f"{content}\n"
    )
    response = chat(prompt, client)
    match = re.search(r"<answer>(.*?)</answer>", response)
    if match is None:
        print("No answer tag found in response.", response)
        return None
    try:
        match = match.group(1).strip()
        score = float(match)
        if 0 <= score <= 1:
            return score
        else:
            print(f"Score {score} is out of range [0, 1].")
            return None
    except ValueError:
        print(f"Failed to parse score from response: {match}")
        return None


def parse_debate_code(debate_code: str):
    """
    解析辩论图代码，返回观点列表和链关系列表
    观点格式: id:内容
    链格式: a1->a2, a1->!a2, a1|a2->a3, a1&a2->a3
    """
    opinions = []
    links = []
    for line in debate_code.split(";"):
        line = line.strip()
        if not line:
            continue
        if ":" in line and "->" not in line:
            # 观点
            oid, content = line.split(":", 1)
            opinions.append({"id": oid.strip(), "content": content.strip()})
        elif "->" in line:
            links.append(line)
    return opinions, links


def create_debate(title, description, creator, session) -> str:
    resp = session.post(
        f"{BACKEND_URL}/debate/create",
        json={"title": title, "description": description, "creator": creator},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def create_or_opinion(opinion, debate_id, session, creator="ai") -> str:
    # AI 打分
    resp = session.post(
        f"{BACKEND_URL}/opinion/create_or",
        json={
            "content": opinion["content"],
            "logic_type": "or",
            "is_llm_score": False,
            "creator": creator,
            "debate_id": debate_id,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["id"]


def create_link(from_id, to_id, session, link_type="supports"):
    resp = session.post(
        f"{BACKEND_URL}/link/create",
        json={
            "from_id": from_id,
            "to_id": to_id,
            "link_type": link_type,
        },
        timeout=30,
    )
    resp.raise_for_status()
    if resp.json()["is_success"] is False:
        raise ValueError(f"Failed to create link: {resp.json()['message']}")


def create_and_opinion(
    parent_id,
    son_ids,
    debate_id,
    session,
    link_type="supports",
    creator="ai",
) -> str:
    resp = session.post(
        f"{BACKEND_URL}/opinion/create_and",
        json={
            "parent_id": parent_id,
            "son_ids": son_ids,
            "link_type": link_type,
            "creator": creator,
            "host": "local",
            "debate_id": debate_id,
        },
        timeout=30,
    )
    resp.raise_for_status()
    if resp.json()["is_success"] is False:
        raise ValueError(f"Failed to create and opinion: {resp.json()['message']}")
    return resp.json()["id"]


def score_root_opinion(debate_id, session, client: OpenAI):
    resp = session.post(
        f"{BACKEND_URL}/opinion/head",
        json={"debate_id": debate_id, "is_leaf": False},
        timeout=30,
    )
    resp.raise_for_status()
    if resp.json()["is_success"] is False:
        raise ValueError(f"Failed to score root opinion: {resp.json()['message']}")
    root_ids = resp.json()["data"]
    if not root_ids:
        raise ValueError("No root opinion found in the debate.")
    for root_id in root_ids:
        # 先获取观点内容
        info_resp = session.get(
            f"{BACKEND_URL}/opinion/info",
            params={"opinion_id": root_id, "debate_id": debate_id},
            timeout=30,
        )
        info_resp.raise_for_status()
        content = info_resp.json()["data"]["content"]
        # 调用 LLM 打分
        score = eval_opinion(content, client)
        if score is None:
            continue
        # 更新观点分数
        patch_resp = session.post(
            f"{BACKEND_URL}/opinion/patch",
            json={
                "id": root_id,
                "score": {"positive": score},
            },
            timeout=30,
        )
        patch_resp.raise_for_status()
        if patch_resp.json().get("is_success") is False:
            raise ValueError(
                f"Failed to patch opinion score: {patch_resp.json().get('msg')}"
            )


def main():
    client = OpenAI(
        api_key=API_KEY,
        base_url=BASE_URL,
    )
    with open(DOC_PATH, "r", encoding="utf-8") as f:
        doc = f.read()
    debate_title, debate_code = ai_struct(doc, client)
    # 1. 解析辩论图代码
    opinions, links = parse_debate_code(debate_code)
    # 2. 创建debate
    with httpx.Client() as session:
        debate_id = create_debate(debate_title, doc[:10], creator="ai", session=session)
        # 3. 创建观点，记录id映射
        id_map = {}
        for op in opinions:
            oid = create_or_opinion(op, debate_id, session)
            id_map[op["id"]] = oid
        # 4. 创建链，处理与节点
        for link in links:
            left, right = link.split("->")
            left = left.strip()
            right = right.strip()
            to_neg = False
            if right.startswith("!"):
                to_neg = True
                right = right[1:]
            # 处理多前提
            if "&" in left:
                # 创建与节点
                from_keys = [i.strip() for i in left.split("&")]
                from_ids = [id_map[k] for k in from_keys]
                # 创建与节点（parent为目标观点，sons为前提）
                create_and_opinion(
                    parent_id=id_map[right],
                    son_ids=from_ids,
                    debate_id=debate_id,
                    session=session,
                    link_type="supports" if not to_neg else "opposes",
                )
            else:
                # 或节点/单前提
                if "|" in left:
                    from_ids = [id_map[i.strip()] for i in left.split("|")]
                else:
                    from_ids = [id_map[left]]
                to_id = id_map[right]
                for from_id in from_ids:
                    create_link(
                        from_id,
                        to_id,
                        session,
                        link_type="supports" if not to_neg else "opposes",
                    )
        # 5. 对根节点打分
        score_root_opinion(debate_id, session, client)


if __name__ == "__main__":
    main()
