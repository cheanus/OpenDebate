import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin, FastAPIUsers
from ..db_life import User, get_user_db
from .backend import auth_backend
from config import SECRET_KEY


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SECRET_KEY
    verification_token_secret = SECRET_KEY

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend],
)
