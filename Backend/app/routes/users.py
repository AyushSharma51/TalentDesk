from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_user,
    ensure_can_manage_company,
)
from app.database import get_db
from app.models import User, UserCompany
from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserUpdate,
    CompanyAssignmentCreate,
    CompanyAssignmentResponse,
    CompanyAssignmentUpdate,
)
from app.services import user_service


router = APIRouter(prefix="/users", tags=["Users"])


def require_super_admin_access(current_user: User) -> None:
    if current_user.global_role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required",
        )


@router.get("/", response_model=list[UserResponse])
def list_users(
    is_active: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.global_role == "super_admin":
        return user_service.list_users(db, is_active)

    company_ids = list(
        db.scalars(
            select(UserCompany.company_id).where(
                UserCompany.user_id == current_user.id,
                UserCompany.role == "admin",
                UserCompany.is_active.is_(True),
            )
        ).all()
    )

    if not company_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User management access denied",
        )

    users = []
    seen_user_ids = set()

    for company_id in company_ids:
        company_users = user_service.list_company_users(
            db,
            company_id,
            is_active,
        )

        for user in company_users:
            if user.id not in seen_user_ids:
                users.append(user)
                seen_user_ids.add(user.id)

    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = user_service.get_user(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if current_user.global_role == "super_admin":
        return user

    admin_company_ids = set(
        db.scalars(
            select(UserCompany.company_id).where(
                UserCompany.user_id == current_user.id,
                UserCompany.role == "admin",
                UserCompany.is_active.is_(True),
            )
        ).all()
    )

    user_company_ids = {
        assignment.company_id
        for assignment in user.company_assignments
        if assignment.is_active
    }

    if not admin_company_ids.intersection(user_company_ids):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot access this user's details",
        )

    return user


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ensure_can_manage_company(
            db=db,
            current_user=current_user,
            company_id=user_data.company_id,
        )

        return user_service.create_user(db, user_data)

    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin_access(current_user)

    try:
        user = user_service.update_user(db, user_id, user_data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin_access(current_user)

    try:
        user = user_service.deactivate_user(db, user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )


@router.post(
    "/{user_id}/companies",
    response_model=CompanyAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def assign_company(
    user_id: int,
    assignment_data: CompanyAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        ensure_can_manage_company(
            db=db,
            current_user=current_user,
            company_id=assignment_data.company_id,
        )

        return user_service.assign_company(
            db,
            user_id,
            assignment_data,
        )

    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


# --------------------------------------------------
# Active users for a company
# Keep this route before the generic /{user_id} route
# --------------------------------------------------

@router.get(
    "/company/{company_id}",
    response_model=list[UserResponse],
)
def get_users_by_company(
    company_id: int,
    is_active: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_company(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    return user_service.list_company_users(
        db,
        company_id,
        is_active,
    )


# --------------------------------------------------
# Removed users for a company
# --------------------------------------------------

@router.get("/company/{company_id}/removed")
def list_removed_company_users(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_company(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    assignments = user_service.list_inactive_company_assignments(
        db=db,
        company_id=company_id,
    )

    return [
        {
            "id": assignment.user.id,
            "full_name": assignment.user.full_name,
            "email": assignment.user.email,
            "role": assignment.role,
            "company_id": assignment.company_id,
            "is_active": assignment.is_active,
        }
        for assignment in assignments
        if assignment.user is not None
    ]


# --------------------------------------------------
# Remove a user from a company (soft removal)
# --------------------------------------------------

@router.delete(
    "/{user_id}/companies/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_company_assignment(
    user_id: int,
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_company(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    try:
        user_service.remove_company_assignment(
            db,
            user_id,
            company_id,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


# --------------------------------------------------
# Change a user's role in a company
# --------------------------------------------------

@router.patch(
    "/{user_id}/companies/{company_id}",
    response_model=CompanyAssignmentResponse,
)
def update_company_role(
    user_id: int,
    company_id: int,
    assignment_data: CompanyAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_company(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    try:
        return user_service.update_company_role(
            db,
            user_id,
            company_id,
            assignment_data,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


# --------------------------------------------------
# Update a user's global active status (Super Admin)
# --------------------------------------------------

@router.patch("/{user_id}/companies/{company_id}/status")
def update_company_user_status(
    user_id: int,
    company_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_super_admin_access(current_user)

    user = user_service.get_user(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    assignment = db.get(UserCompany, (user_id, company_id))

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not assigned to this company",
        )

    # This endpoint changes the global User status, not the
    # company assignment status.
    user.is_active = is_active

    db.commit()
    db.refresh(user)

    return {
        "message": "User status updated successfully",
        "user_id": user.id,
        "is_active": user.is_active,
    }


# --------------------------------------------------
# Restore a previously removed company assignment
# --------------------------------------------------

@router.post(
    "/{user_id}/companies/{company_id}/restore",
    status_code=status.HTTP_200_OK,
)
def restore_company_assignment(
    user_id: int,
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_company(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    try:
        assignment = user_service.restore_company_assignment(
            db=db,
            user_id=user_id,
            company_id=company_id,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return {
        "message": "User restored to company successfully",
        "user_id": assignment.user_id,
        "company_id": assignment.company_id,
        "role": assignment.role,
    }