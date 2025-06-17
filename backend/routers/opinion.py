from fastapi import APIRouter, Query
from typing import Annotated
from schemas.opinion import *
from schemas.msg import MsgResponse
from core.opinion import (
    create_opinion,
    delete_opinion,
    info_opinion,
    query_opinion,
    patch_opinion,
)

router = APIRouter()


@router.post("/create", response_model=MsgResponse)
def create_opinion_http(request: CreateOpinionRequest):
    if request.is_llm_score:
        try:
            pass
        except Exception as e:
            return {"is_success": False, "error": str(e)}
    try:
        create_opinion(
            content=request.content,
            host="local",
            creator=request.creator,
            node_type="solid",
            logic_type=request.logic_type,
            debate_id=request.debate_id,
        )
        result = {"is_success": True}
    except Exception as e:
        result = {"is_success": False, "error": str(e)}

    return result


@router.post("/delete", response_model=MsgResponse)
def delete_opinion_http(request: DeleteOpinionRequest):
    try:
        delete_opinion(
            opinion_id=request.opinion_id,
            debate_id=request.debate_id,
        )
        result = {"is_success": True}
    except Exception as e:
        result = {"is_success": False, "error": str(e)}

    return result


@router.get("/info", response_model=InfoOpinionResponse)
def info_opinion_http(filter_query: Annotated[InfoOpinionRequest, Query()]):
    try:
        result = info_opinion(
            opinion_id=filter_query.opinion_id,
            debate_id=filter_query.debate_id,
        )
        return {
            "is_success": True,
            "data": result,
        }
    except Exception as e:
        return {
            "is_success": False,
            "msg": str(e),
        }


@router.get("/query", response_model=QueryOpinionResponse)
def query_opinion_http(filter_query: Annotated[QueryOpinionRequest, Query()]):
    try:
        result = query_opinion(
            q=filter_query.q,
            debate_id=filter_query.debate_id,
            min_score=filter_query.min_score,
            max_score=filter_query.max_score,
        )
        return {
            "is_success": True,
            "data": result,
        }
    except Exception as e:
        return {
            "is_success": False,
            "msg": str(e),
        }


@router.post("/patch", response_model=MsgResponse)
def patch_opinion_http(request: PatchOpinionRequest):
    try:
        patch_opinion(
            opinion_id=request.id,
            content=request.content,
            is_llm_score=request.is_llm_score,
            creator=request.creator,
        )
        return {"is_success": True}
    except Exception as e:
        return {"is_success": False, "error": str(e)}
