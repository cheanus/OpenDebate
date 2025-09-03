from .debate import create_debate
from .opinion import (
    create_or_opinion,
    create_and_opinion,
    head_opinion,
    info_opinion,
    patch_opinion,
    query_opinion,
)
from .link import create_link
from schemas.link import LinkType
from typing import Optional, Dict, List
from .utils.llm import llm_chat
import re
import json
import time


def _default_parse_list_response(text: str) -> dict:
    """Try to parse text as JSON; fall back to simple line-split lists.

    Expected JSON format:
    {"supports": ["..."], "opposes": ["..."], "debate": true}
    """
    try:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match is None:
            raise ValueError("Response does not contain valid JSON data.")
        data = json.loads(match.group(0))
        return {
            "supports": data.get("supports", []) or [],
            "opposes": data.get("opposes", []) or [],
            "supports_and": data.get("supports_and", []) or [],
            "opposes_and": data.get("opposes_and", []) or [],
            "debate": bool(data.get("debate", True)),
        }
    except Exception:
        return {"debate": False}


def _ask_llm_for_children(op_content: str) -> dict:
    """Ask LLM to propose supports/opposes (and groups)."""
    prompt = (
        "请给出对以下观点的支持和反对的简短观点（每条为一句可判真假的陈述）。\n"
        "可用and组合“与”的观点（如A且B支持），默认用or组合“或”的观点（如A支持或B支持）。\n"
        "支持和反驳关系必须逻辑上有效，否则考虑用and组合更多论据。\n"
        "观点内容必须完整，禁止使用指代性词汇（如“该观点”、“该内容”等）代表另一观点，观点必须自包含且明确。\n"
        "每类最多返回3条；如果该观点不需要继续辩论，请返回空数组并将 debate 置为 false。\n"
        "要求输出为严格的 JSON，格式例：{"
        '"supports": ["..."], "opposes": ["..."], "supports_and": [["A","B"]], "opposes_and": [["A","B"]], "debate": true'
        "}\n"
        f"观点内容：\n{op_content}"
    )
    resp_text = llm_chat(prompt)
    return _default_parse_list_response(resp_text)


def _ask_llm_for_opinion(text: str) -> str:
    """Ask LLM to propose supports/opposes (and groups)."""
    prompt = (
        "请提取以下内容所涉及的核心观点内容，观点必须为一句可判真假的陈述。\n"
        "将观点内容放在<opinion></opinion>两个tag中。\n"
        f"观点内容：\n{text}\n"
    )
    resp_text = llm_chat(prompt)
    try:
        m = re.search(r"<opinion>(.*?)</opinion>", resp_text, re.S)
        if m:
            return m.group(1).strip()
        else:
            raise ValueError("No opinion found in LLM response.")
    except Exception as e:
        raise ValueError(f"Failed to parse LLM response: {e}")


def _ensure_or_create_opinion(
    stmt: str,
    debate_id: str,
    creator: str,
    created_ids: List[str],
) -> str:
    """Find an existing opinion by text in the debate or create a new OR opinion."""
    # TODO: 未来使用向量相似度搜索
    found = query_opinion(q=stmt, debate_id=debate_id, max_num=1)
    if found:
        fid = found[0].get("id")
        return str(fid)
    sid = create_or_opinion(content=stmt, creator=creator, debate_id=debate_id)
    created_ids.append(sid)
    return sid


def _create_or_children(
    oid: str,
    supports: list,
    opposes: list,
    debate_id: str,
    created_ids: List[str],
    max_nodes: int,
    creator: str = "ai",
):
    """Create OR children and return a list of (child_id, LinkType)."""
    new_children = []
    for child_text in supports:
        if len(created_ids) >= max_nodes:
            break
        try:
            child_id = create_or_opinion(
                content=child_text, creator=creator, debate_id=debate_id
            )
            created_ids.append(child_id)
            new_children.append((child_id, LinkType.SUPPORT))
        except Exception as e:
            print(f"Failed to create support opinion for {oid}: {e}")
    for child_text in opposes:
        if len(created_ids) >= max_nodes:
            break
        try:
            child_id = create_or_opinion(
                content=child_text, creator=creator, debate_id=debate_id
            )
            created_ids.append(child_id)
            new_children.append((child_id, LinkType.OPPOSE))
        except Exception as e:
            print(f"Failed to create oppose opinion for {oid}: {e}")
    # link OR children to parent
    for child_id, ltype in new_children:
        try:
            create_link(from_id=child_id, to_id=oid, link_type=ltype)
        except Exception as e:
            print(f"Failed to create link {child_id}->{oid}: {e}")
    return new_children


def _create_and_groups(
    oid: str,
    groups: list,
    debate_id: str,
    created_ids: List[str],
    max_nodes: int,
    link_type: LinkType,
    creator: str = "ai",
):
    """Create AND nodes for each group (group is list of statements)."""
    and_ids = []
    for group in groups:
        if len(created_ids) >= max_nodes:
            break
        try:
            son_ids = []
            for stmt in group:
                sid = _ensure_or_create_opinion(stmt, debate_id, creator, created_ids)
                son_ids.append(sid)
            and_id, _, _ = create_and_opinion(
                parent_id=oid,
                son_ids=son_ids,
                link_type=link_type,
                creator=creator,
                debate_id=debate_id,
            )
            created_ids.append(and_id)
            created_ids.extend(son_ids)
            and_ids.append(and_id)
        except Exception as e:
            typ = "SUPPORT" if link_type == LinkType.SUPPORT else "OPPOSE"
            print(f"Failed to create {typ} AND for {oid}: {e}")
    return and_ids


def _score_leaves_and_patch(debate_id: str, root_opinion: str) -> Dict[str, Optional[float]]:
    """Score all leaf nodes via LLM in a single call and patch their positive score."""
    leaf_ids = head_opinion(debate_id, is_root=False)
    if not leaf_ids:
        return {}

    # Collect all leaf contents
    leaf_contents = []
    for lid in leaf_ids:
        try:
            opinfo = info_opinion(lid, debate_id)
            content = opinfo.get('content', '')
            leaf_contents.append((lid, content))
        except Exception as e:
            print(f"Failed to get info for leaf {lid}: {e}")
            leaf_contents.append((lid, ''))

    # Build prompt for batch scoring
    prompt_parts = [
        f"目前的辩论主题是：“{root_opinion}”是否正确",
        "请为下列观点内容打分，每个观点的评分范围为0-1的浮点数，如0.50。如果无法判断，请输出None。",
        "输出格式为严格的JSON对象，键为观点编号（从1开始），值为评分。",
        "例如：{\"1\": 0.8, \"2\": None, \"3\": 0.65}："
    ]
    for i, (lid, content) in enumerate(leaf_contents, 1):
        prompt_parts.append(f"观点{i}: {content}")
    prompt = "\n".join(prompt_parts)

    scores: Dict[str, Optional[float]] = {}
    try:
        resp = llm_chat(prompt)
        # Try to extract JSON from response
        match = re.search(r"\{.*\}", resp, re.DOTALL)
        if match:
            json_str = match.group(0)
            try:
                parsed_scores = json.loads(json_str)
                for i, (lid, _) in enumerate(leaf_contents, 1):
                    score_str = parsed_scores.get(str(i))
                    if score_str is not None:
                        try:
                            val = float(score_str)
                            if 0 <= val <= 1:
                                scores[lid] = val
                                patch_opinion(opinion_id=lid, score={"positive": val})
                            else:
                                scores[lid] = None
                        except (ValueError, TypeError):
                            scores[lid] = None
                    else:
                        scores[lid] = None
            except json.JSONDecodeError:
                print("Failed to parse JSON from LLM response.")
                for lid, _ in leaf_contents:
                    scores[lid] = None
        else:
            print("No JSON found in LLM response.")
            for lid, _ in leaf_contents:
                scores[lid] = None
    except Exception as e:
        print(f"Failed to score leaves: {e}")
        for lid, _ in leaf_contents:
            scores[lid] = None

    return scores


def ai_build_debate_from_opinion(
    root_content: str,
    max_nodes: int = 20,
    creator: str = "ai",
    sleep_between_calls: float = 0.0,
) -> str:
    """Use an LLM to iteratively build a debate graph from a single opinion.

    Contract:
    - Inputs: root_content (str), max_nodes (int)
    - Outputs: debate_id (str)

    Behavior summary:
    1. Create a debate and a root OR opinion for `root_content`.
    2. Repeatedly expand leaf opinions by asking the LLM to propose up to 3 supporting and 3 opposing short, testable statements.
       The LLM may indicate a leaf "need not be debated" by returning empty lists or debate=false.
    3. Stop when either all leaves are marked non-debatable, or total created opinions >= max_nodes.
    4. For all leaf opinions, ask the LLM to provide a score in [0,1] and patch the opinion positive score.

    Notes:
    - llm_chat must return a plain string. Prefer returning JSON: {"supports":[], "opposes":[], "debate": true}.
    - The function is conservative: it creates OR opinions for each suggestion and links them to the parent.
    """
    # 1. create debate
    desp = root_content if len(root_content) <= 120 else root_content[:117] + "..."
    root_opinion = _ask_llm_for_opinion(root_content)
    debate_id = create_debate(title=root_opinion, creator=creator, description=desp)

    created_ids: List[str] = []

    # 2. create root opinion
    root_id = create_or_opinion(
        content=root_opinion, creator=creator, debate_id=debate_id
    )
    created_ids.append(root_id)

    # track which leaves should no longer be expanded
    no_debate_set = set()

    # BFS queue of leaf ids to consider
    queue: List[str] = [root_id]

    # Helper to get current leafs
    def current_leafs() -> List[str]:
        return head_opinion(debate_id, is_root=False)

    # expansion loop
    while queue and len(created_ids) < max_nodes:
        oid = queue.pop(0)
        if oid in no_debate_set:
            continue
        # ask LLM and use helper functions to create children
        info = info_opinion(oid, debate_id)
        content = info.get("content") or ""
        if not content.strip():
            no_debate_set.add(oid)
            continue
        try:
            parsed = _ask_llm_for_children(content)
        except Exception as e:
            print(f"LLM call failed for opinion {oid}: {e}")
            continue

        supports = parsed.get("supports", [])
        opposes = parsed.get("opposes", [])
        supports_and = parsed.get("supports_and", [])
        opposes_and = parsed.get("opposes_and", [])
        should_debate = bool(parsed.get("debate", True))

        if not should_debate or (
            not supports and not opposes and not supports_and and not opposes_and
        ):
            no_debate_set.add(oid)
            leaves = current_leafs()
            if all(l in no_debate_set for l in leaves):
                break
            continue

        # create OR children
        new_children = _create_or_children(
            oid,
            supports,
            opposes,
            debate_id,
            created_ids,
            max_nodes,
        )

        # append new children to queue for further expansion
        queue.extend([cid for cid, _ in new_children])

        # create AND groups
        new_children = _create_and_groups(
            oid,
            supports_and,
            debate_id,
            created_ids,
            max_nodes,
            LinkType.SUPPORT,
        )

        # append new children to queue for further expansion
        queue.extend(new_children)

        new_children = _create_and_groups(
            oid,
            opposes_and,
            debate_id,
            created_ids,
            max_nodes,
            LinkType.OPPOSE,
        )

        # append new children to queue for further expansion
        queue.extend(new_children)

        # small throttle
        time.sleep(sleep_between_calls)

        # refresh queue with current leaves if queue empty
        if not queue:
            queue = [l for l in current_leafs() if l not in no_debate_set]

    # After expansion, score all leaf nodes via helper
    _score_leaves_and_patch(debate_id, root_opinion)

    return debate_id
