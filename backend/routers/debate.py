from fastapi import APIRouter, Query
from typing import Annotated
from schemas.db.neo4j import Opinion as OpinionNeo4j
from schemas.debate import *
from schemas.msg import MsgResponse
from core.debate import (
    create_debate,
    delete_debate,
    query_debate,
    patch_debate,
    cited_in_debate,
)

router = APIRouter()


@router.post("/create", response_model=CreateDebateResponse)
def create_debate_http(request: CreateDebateRequest):
    title = request.title
    creator = request.creator
    description = request.description

    # 调用核心函数实现逻辑
    try:
        id = create_debate(title, creator, description)
        result = {"is_success": True, "id": id}
    except Exception as e:
        result = {"is_success": False, "msg": str(e)}

    return result


@router.post("/delete", response_model=MsgResponse)
def delete_debate_http(request: DeleteDebateRequest):
    debate_id = request.id

    # 调用核心函数实现逻辑
    try:
        delete_debate(debate_id)
        result = {"is_success": True}
    except Exception as e:
        result = {"is_success": False, "msg": str(e)}

    return result


@router.get("/query", response_model=QueryDebateResponse)
def query_debate_http(filter_query: Annotated[QueryDebateRequest, Query()]):
    title = filter_query.title
    description = filter_query.description
    creator = filter_query.creator
    debate_id = filter_query.debate_id
    start_timestamp = filter_query.start_timestamp
    end_timestamp = filter_query.end_timestamp

    try:
        debates = query_debate(
            title, description, creator, start_timestamp, end_timestamp, debate_id
        )
        result = {
            "is_success": True,
            "data": debates,
        }
    except Exception as e:
        result = {"is_success": False, "msg": str(e)}
    return result


@router.post("/patch", response_model=MsgResponse)
def patch_debate_http(request: PatchDebateRequest):
    debate_id = request.id
    title = request.title
    description = request.description
    creator = request.creator

    try:
        patch_debate(debate_id, title, description, creator)
        result = {"is_success": True}
    except Exception as e:
        result = {"is_success": False, "msg": str(e)}

    return result


@router.post("/cite", response_model=MsgResponse)
def cited_in_debate_http(request: CiteDebateRequest):
    debate_id = request.debate_id
    opinion_id = request.opinion_id

    try:
        node_type = OpinionNeo4j.nodes.get(uid=opinion_id).node_type
        if node_type != "solid":
            raise ValueError("Only solid opinions can be cited in debates.")
        cited_in_debate(debate_id, opinion_id)
        result = {"is_success": True}
    except Exception as e:
        result = {"is_success": False, "msg": str(e)}

    return result
