from fastapi import APIRouter, Query
from typing import Annotated
from schemas.opinion import *
from schemas.msg import MsgResponse
from core.opinion import (
    create_or_opinion,
    create_and_opinion,
    delete_opinion,
    info_opinion,
    query_opinion,
    patch_opinion,
)

router = APIRouter()


@router.post("/create_or", response_model=MsgResponse)
def create_or_opinion_http(request: CreateOrOpinionRequest):
    if request.is_llm_score:
        try:
            pass
        except Exception as e:
            return {"is_success": False, "error": str(e)}
    try:
        create_or_opinion(
            content=request.content,
            creator=request.creator,
            host="local",
            node_type="solid",
            positive_score=request.positive_score,
            debate_id=request.debate_id,
        )
        result = {"is_success": True}
    except Exception as e:
        result = {"is_success": False, "error": str(e)}

    return result


@router.post("/create_and", response_model=MsgResponse)
def create_and_opinion_http(request: CreateAndOpinionRequest):
    try:
        create_and_opinion(
            parent_id=request.parent_id,
            son_ids=request.son_ids,
            link_type=request.link_type,
            creator=request.creator,
            host="local",
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
