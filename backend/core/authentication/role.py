from fastapi import HTTPException, status
from schemas.db.psql import User
from fastapi import Depends
from .user_manager import fastapi_users


levels = {
    "user": 1,
    "admin": 2,
}


def require_role(required_min_roles: str):
    current_active_user = fastapi_users.current_user(active=True)

    def role_checker(user: User = Depends(current_active_user)):
        if levels[str(user.role)] < levels[required_min_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return user

    return role_checker
