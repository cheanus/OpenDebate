from pydantic import BaseModel, Field
from .msg import MsgResponse


class CreateDebateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    creator: str = Field(..., min_length=1)
    description: str | None = None


class DeleteDebateRequest(BaseModel):
    id: str = Field(..., min_length=1)


class QueryDebateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    creator: str | None = None
    debate_id: str | None = None
    start_timestamp: float | None = Field(
        None,
        description="Start timestamp for filtering debates, in seconds since epoch",
    )
    end_timestamp: float | None = Field(
        None, description="End timestamp for filtering debates, in seconds since epoch"
    )


class QueryDebateResponse(MsgResponse):
    data: list[dict] | None = Field(
        None, description="List of debates matching the query parameters"
    )


class PatchDebateRequest(BaseModel):
    id: str = Field(..., min_length=1)
    title: str | None = None
    description: str | None = None
    creator: str | None = None


class CiteDebateRequest(BaseModel):
    debate_id: str = Field(..., min_length=1)
    opinion_id: str = Field(..., min_length=1)
