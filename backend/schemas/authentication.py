import uuid
from fastapi_users import schemas
from pydantic import Field, field_validator


class UserRead(schemas.BaseUser[uuid.UUID]):
    role: str = Field(..., description="User role")
    username: str

    @field_validator("username")
    def forbid_reserved_names(cls, v: str) -> str:
        forbidden = {"ai", "system"}
        if v in forbidden:
            raise ValueError("This username is reserved and cannot be used.")
        return v


class UserCreate(schemas.BaseUserCreate):
    username: str


class UserUpdate(schemas.BaseUserUpdate):
    pass
