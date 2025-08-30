from fastapi import APIRouter, Query
from typing import Annotated
from core.link import (
    create_link,
    delete_link_by_info,
    info_link,
    patch_link,
    attack_link,
)
from schemas.link import *
from schemas.msg import MsgResponse
from schemas.db.neo4j import Opinion as OpinionNeo4j

router = APIRouter()


@router.post("/create", response_model=CreateLinkResponse)
def create_link_http(request: CreateLinkRequest):
    """
    创建一个链（两个已存在观点间）
    """
    try:
        # Check if the neighborhood opinion is not AND opinion
        from_opinion = OpinionNeo4j.nodes.get(uid=request.from_id)
        to_opinion = OpinionNeo4j.nodes.get(uid=request.to_id)
        if from_opinion.logic_type == "and" or to_opinion.logic_type == "and":
            return {
                "is_success": False,
                "msg": "Cannot create link to an AND opinion.",
            }
        link_id, updated_nodes = create_link(
            from_id=request.from_id, to_id=request.to_id, link_type=request.link_type
        )
        need_updated_nodes = {k: updated_nodes[k] for k in updated_nodes if updated_nodes[k] is not None}
        return {"is_success": True, "id": link_id, "updated_nodes": need_updated_nodes}
    except Exception as e:
        return {"is_success": False, "msg": str(e)}


@router.post("/delete", response_model=DeleteLinkResponse)
def delete_link_http(request: LinkRequest):
    """
    删除一个链（两个已存在观点间）
    """
    try:
        link_info = info_link(link_id=request.link_id)
        to_opinion = OpinionNeo4j.nodes.get(uid=link_info["to_id"])
        if to_opinion.logic_type == "and":
            return {
                "is_success": False,
                "msg": "Cannot delete link to an AND opinion.",
            }
        updated_nodes = delete_link_by_info(link_info=link_info)
        need_updated_nodes = {k: updated_nodes[k] for k in request.loaded_ids if k in updated_nodes}
        return {"is_success": True, "updated_nodes": need_updated_nodes}
    except Exception as e:
        return {"is_success": False, "msg": str(e)}


@router.get("/info", response_model=InfoLinkResponse)
def info_link_http(filter_query: Annotated[LinkRequest, Query()]):
    """
    查询一个链（两个已存在观点间）的信息
    """
    try:
        link_info = info_link(link_id=filter_query.link_id)
        return {
            "is_success": True,
            "id": filter_query.link_id,
            "from_id": link_info["from_id"],
            "to_id": link_info["to_id"],
            "link_type": link_info["link_type"],
        }
    except Exception as e:
        return {"is_success": False, "msg": str(e)}


@router.post("/patch", response_model=MsgResponse)
def patch_link_http(request: PatchLinkRequest):
    """
    修改一个链（两个已存在观点间）
    """
    try:
        updated_nodes = patch_link(link_id=request.link_id, link_type=request.link_type)
        need_updated_nodes = {k: updated_nodes[k] for k in request.loaded_ids if k in updated_nodes}
        return {"is_success": True, "updated_nodes": need_updated_nodes}
    except Exception as e:
        return {"is_success": False, "msg": str(e)}


@router.post("/attack", response_model=AttackLinkResponse)
def attack_link_http(request: AttackLinkRequest):
    """
    对链辩论，即对链进行攻击，返回OR和AND观点的ID
    """
    try:
        or_id, and_id = attack_link(link_id=request.link_id, debate_id=request.debate_id)
        return {"is_success": True, "or_id": or_id, "and_id": and_id}
    except Exception as e:
        return {"is_success": False, "msg": str(e)}
