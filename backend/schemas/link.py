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


class LinkRequest(BaseModel):
    link_id: str


class InfoLinkResponse(MsgResponse):
    from_id: str | None = None
    to_id: str | None = None
    link_type: LinkType | None = None


class PatchLinkRequest(BaseModel):
    link_id: str
    link_type: LinkType


class AttackLinkRequest(BaseModel):
    link_id: str
    debate_id: str


class AttackLinkResponse(MsgResponse):
    or_id: str | None = None
    and_id: str | None = None
