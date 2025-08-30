from pydantic import BaseModel, Field
from .msg import MsgResponse
from enum import Enum


class LinkType(str, Enum):
    SUPPORT = "supports"
    OPPOSE = "opposes"


class CreateLinkRequest(BaseModel):
    from_id: str
    to_id: str
    link_type: LinkType
    loaded_ids: list[str] = Field(
        [], description="List of opinion IDs that are already loaded in the frontend"
    )


class CreateLinkResponse(MsgResponse):
    id: str | None = None
    updated_nodes: dict[str, dict[str, float | None]] | None = Field(
        None, description="IDs of nodes with updated scores and their new scores"
    )


class LinkRequest(BaseModel):
    link_id: str
    loaded_ids: list[str] = Field(
        [], description="List of opinion IDs that are already loaded in the frontend"
    )


class DeleteLinkResponse(MsgResponse):
    updated_nodes: dict[str, dict[str, float | None]] | None = Field(
        None, description="IDs of nodes with updated scores and their new scores"
    )


class InfoLinkResponse(MsgResponse):
    id: str | None = None
    from_id: str | None = None
    to_id: str | None = None
    link_type: LinkType | None = None


class PatchLinkRequest(BaseModel):
    link_id: str
    link_type: LinkType
    loaded_ids: list[str] = Field(
        [], description="List of opinion IDs that are already loaded in the frontend"
    )


class PatchLinkResponse(MsgResponse):
    updated_nodes: dict[str, dict[str, float | None]] | None = Field(
        None, description="IDs of nodes with updated scores and their new scores"
    )


class AttackLinkRequest(BaseModel):
    link_id: str
    debate_id: str


class AttackLinkResponse(MsgResponse):
    or_id: str | None = None
    and_id: str | None = None
