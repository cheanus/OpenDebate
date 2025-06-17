from fastapi import APIRouter, Query
from typing import Annotated
from core.link import create_link, delete_link, info_link, patch_link
from schemas.link import *
from schemas.msg import MsgResponse

router = APIRouter()


@router.post("/create", response_model=CreateLinkResponse)
def create_link_http(request: CreateLinkRequest):
    """
    创建一个链（两个已存在观点间）
    """
    try:
        link_id = create_link(
            from_id=request.from_id, to_id=request.to_id, link_type=request.link_type
        )
        return {"is_success": True, "link_id": link_id}
    except Exception as e:
        return {"is_success": False, "error": str(e)}


@router.post("/delete", response_model=MsgResponse)
def delete_link_http(request: DeleteLinkRequest):
    """
    删除一个链（两个已存在观点间）
    """
    try:
        delete_link(link_id=request.id)
        return {"is_success": True}
    except Exception as e:
        return {"is_success": False, "error": str(e)}


@router.get("/info", response_model=InfoLinkResponse)
def info_link_http(filter_query: Annotated[InfoLinkRequest, Query()]):
    """
    查询一个链（两个已存在观点间）的信息
    """
    try:
        link_info = info_link(link_id=filter_query.link_id)
        return {
            "is_success": True,
            "from_id": link_info["from_id"],
            "to_id": link_info["to_id"],
            "link_type": link_info["link_type"],
        }
    except Exception as e:
        return {"is_success": False, "error": str(e)}


@router.post("/patch", response_model=MsgResponse)
def patch_link_http(request: PatchLinkRequest):
    """
    修改一个链（两个已存在观点间）
    """
    try:
        patch_link(link_id=request.id, link_type=request.link_type)
        return {"is_success": True}
    except Exception as e:
        return {"is_success": False, "error": str(e)}
