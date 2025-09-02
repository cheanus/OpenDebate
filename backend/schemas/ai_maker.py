from pydantic import BaseModel, Field
from .msg import MsgResponse


class CreateDebateRequest(BaseModel):
    content: str = Field(..., description="The root opinion content")


class CreateDebateResponse(MsgResponse):
    id: str | None = Field(None, description="ID of the created debate")
