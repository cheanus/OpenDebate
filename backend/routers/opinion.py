from fastapi import APIRouter, Query, Depends
from typing import Annotated
from schemas.opinion import *
from core.opinion import (
    create_or_opinion,
    create_and_opinion,
    delete_opinion,
    info_opinion,
    query_opinion,
    head_opinion,
    patch_opinion,
)
from core.authentication.role import require_role

router = APIRouter()


@router.post("/create_or", response_model=CreateOROpinionResponse)
def create_or_opinion_http(request: CreateOrOpinionRequest, user=Depends(require_role("user"))):
    try:
        node_id = create_or_opinion(
            content=request.content,
            creator=request.creator,
            host="local",
            node_type="solid",
            is_llm_score=True,
            debate_id=request.debate_id,
        )
        result = {"is_success": True, "node_id": node_id}
    except Exception as e:
        result = {"is_success": False, "msg": str(e)}

    return result


@router.post("/create_and", response_model=CreateANDOpinionResponse)
def create_and_opinion_http(request: CreateAndOpinionRequest, user=Depends(require_role("user"))):
    try:
        node_id, link_ids, updated_nodes = create_and_opinion(
            parent_id=request.parent_id,
            son_ids=request.son_ids,
            link_type=request.link_type,
            creator=request.creator,
            host="local",
            debate_id=request.debate_id,
            is_llm_evaluate=True,
        )
        need_updated_nodes = {
            k: updated_nodes[k] for k in request.loaded_ids if k in updated_nodes
        }
        result = {
            "is_success": True,
            "node_id": node_id,
            "link_ids": link_ids,
            "updated_nodes": need_updated_nodes,
        }
    except Exception as e:
        result = {"is_success": False, "msg": str(e)}

    return result


@router.post("/delete", response_model=DeleteOpinionResponse)
def delete_opinion_http(request: DeleteOpinionRequest, user=Depends(require_role("admin"))):
    try:
        updated_nodes = delete_opinion(
            opinion_id=request.opinion_id,
            debate_id=request.debate_id,
        )
        need_updated_nodes = {
            k: updated_nodes[k] for k in request.loaded_ids if k in updated_nodes
        }
        result = {"is_success": True, "updated_nodes": need_updated_nodes}
    except Exception as e:
        result = {"is_success": False, "msg": str(e)}

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
            is_time_accending=filter_query.is_time_accending,
            max_num=filter_query.max_num,
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


@router.post("/head", response_model=HeadOpinionResponse)
def head_opinion_http(request: HeadOpinionRequest):
    try:
        result = head_opinion(
            debate_id=request.debate_id,
            is_root=request.is_root,
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


@router.post("/patch", response_model=PatchOpinionResponse)
def patch_opinion_http(request: PatchOpinionRequest, user=Depends(require_role("admin"))):
    try:
        updated_nodes = patch_opinion(
            opinion_id=request.id,
            content=request.content,
            score=request.score,
            is_llm_score=request.is_llm_score,
            creator=request.creator,
        )
        need_updated_nodes = {
            k: updated_nodes[k] for k in request.loaded_ids if k in updated_nodes
        }
        return {"is_success": True, "updated_nodes": need_updated_nodes}
    except Exception as e:
        return {"is_success": False, "msg": str(e)}
