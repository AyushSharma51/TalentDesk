
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # Swagger sends the email in the "username" field.
    user = authenticate_user(
        db,
        form_data.username,
        form_data.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 30 * 60,
    }



@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
):
    company_assignments = [
        {
            "company_id": assignment.company_id,
            "company_name": assignment.company.name,
            "role": assignment.role,
            "is_active": assignment.is_active,
        }
        for assignment in current_user.company_assignments
        if assignment.is_active
    ]

    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "global_role": current_user.global_role,
        "is_active": current_user.is_active,
        "company_assignments": company_assignments,
    }
