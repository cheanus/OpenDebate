from pydantic import BaseModel
from .msg import MsgResponse
from enum import Enum


class LinkType(str, Enum):
    SUPPORT = "supports"
    OPPOSE = "opposes"


class CreateLinkRequest(BaseModel):
    from_id: str
    to_id: str
    link_type: LinkType


class CreateLinkResponse(MsgResponse):
    link_id: str | None = None


class InfoLinkRequest(BaseModel):
    link_id: str


class InfoLinkResponse(MsgResponse):
    from_id: str
    to_id: str
    link_type: LinkType


class DeleteLinkRequest(BaseModel):
    id: str


class PatchLinkRequest(BaseModel):
    id: str
    link_type: LinkType
