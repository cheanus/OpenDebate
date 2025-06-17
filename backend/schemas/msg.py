from pydantic import BaseModel

class MsgResponse(BaseModel):
    is_success: bool
    msg: str | None = None
