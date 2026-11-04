from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt
from jwt.exceptions import InvalidTokenError
from sqlalchemy import select

from app.core.config import SECRET_KEY, ALGORITHM
from app.database import get_db
from app.models import User, UserCompany

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", ""))
    except (InvalidTokenError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.global_role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required",
        )

    return current_user


def require_company_admin_or_super_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    # Super Admin can manage users across all companies.
    if current_user.global_role == "super_admin":
        return current_user

    # Company Admin authorization is checked separately
    # against the requested company in the service/route.
    return current_user


from sqlalchemy import select
from app.models import UserCompany


def require_company_admin(
    company_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    # Super Admin can manage any company.
    if current_user.global_role == "super_admin":
        return current_user

    # Check whether the user is an Admin of this company.
    assignment = db.scalar(
        select(UserCompany).where(
            UserCompany.user_id == current_user.id,
            UserCompany.company_id == company_id,
            UserCompany.role == "admin",
        )
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access to this company is required",
        )

    return current_user


def ensure_can_manage_company(
    db: Session,
    current_user: User,
    company_id: int,
) -> None:
    if current_user.global_role == "super_admin":
        return

    assignment = db.scalar(
        select(UserCompany).where(
            UserCompany.user_id == current_user.id,
            UserCompany.company_id == company_id,
            UserCompany.role == "admin",
        )
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access to this company is required",
        )
