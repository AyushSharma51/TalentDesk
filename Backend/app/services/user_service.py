
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import User, UserCompany
from app.schemas.user import UserCreate, UserUpdate
from app.models import Company, UserCompany
from app.schemas.user import (
    CompanyAssignmentCreate,
    CompanyAssignmentUpdate,
)

password_hash = PasswordHash.recommended()


def list_users(
    db: Session,
    is_active: bool | None = None,
) -> list[User]:
    statement = select(User).options(
        selectinload(User.company_assignments).selectinload(
            UserCompany.company
        )
    )

    if is_active is not None:
        statement = statement.where(User.is_active == is_active)

    return list(
        db.scalars(statement.order_by(User.id)).all()
    )


def get_user(db: Session, user_id: int) -> User | None:
    statement = (
        select(User)
        .options(
            selectinload(User.company_assignments).selectinload(
                UserCompany.company
            )
        )
        .where(User.id == user_id)
    )

    return db.scalar(statement)


def create_user(db: Session, user_data: UserCreate) -> User:
    email = str(user_data.email).lower()

    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user:
        raise ValueError("Email is already registered")

    user = User(
        full_name=user_data.full_name,
        email=email,
        password_hash=password_hash.hash(user_data.password),
        is_active=True,
    )

    db.add(user)

    try:
        db.commit()
        return get_user(db, user.id)
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("Email is already registered") from exc


def update_user(
    db: Session,
    user_id: int,
    user_data: UserUpdate,
) -> User | None:
    user = get_user(db, user_id)

    if user is None:
        return None

    update_data = user_data.model_dump(exclude_unset=True)

    if "email" in update_data:
        email = str(update_data["email"]).lower()

        existing_user = db.scalar(
            select(User).where(
                User.email == email,
                User.id != user_id,
            )
        )

        if existing_user:
            raise ValueError("Email is already registered")

        update_data["email"] = email

    for field, value in update_data.items():
        setattr(user, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("Could not update user; check unique fields") from exc

    return get_user(db, user_id)


def deactivate_user(db: Session, user_id: int) -> User | None:
    user = db.get(User, user_id)

    if user is None:
        return None

    if not user.is_active:
        raise ValueError("User is already inactive")

    user.is_active = False
    db.commit()

    return user



def assign_company(
    db: Session,
    user_id: int,
    assignment_data: CompanyAssignmentCreate,
) -> UserCompany:
    user = db.get(User, user_id)

    if user is None:
        raise LookupError("User not found")

    if not user.is_active:
        raise ValueError("Cannot assign a company to an inactive user")

    company = db.get(Company, assignment_data.company_id)

    if company is None:
        raise LookupError("Company not found")

    existing = db.get(
        UserCompany,
        (user_id, assignment_data.company_id),
    )

    if existing is not None:
        raise ValueError("User is already assigned to this company")

    assignment = UserCompany(
        user_id=user_id,
        company_id=assignment_data.company_id,
        role=assignment_data.role,
    )

    db.add(assignment)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("Could not create company assignment") from exc

    return db.scalar(
        select(UserCompany)
        .options(selectinload(UserCompany.company))
        .where(
            UserCompany.user_id == user_id,
            UserCompany.company_id == assignment_data.company_id,
        )
    )


def update_company_role(
    db: Session,
    user_id: int,
    company_id: int,
    assignment_data: CompanyAssignmentUpdate,
) -> UserCompany:
    assignment = db.scalar(
        select(UserCompany)
        .options(selectinload(UserCompany.company))
        .where(
            UserCompany.user_id == user_id,
            UserCompany.company_id == company_id,
        )
    )

    if assignment is None:
        raise LookupError("Company assignment not found")

    assignment.role = assignment_data.role
    db.commit()

    return db.scalar(
        select(UserCompany)
        .options(selectinload(UserCompany.company))
        .where(
            UserCompany.user_id == user_id,
            UserCompany.company_id == company_id,
        )
    )


def remove_company_assignment(
    db: Session,
    user_id: int,
    company_id: int,
) -> None:
    assignment = db.get(
        UserCompany,
        (user_id, company_id),
    )

    if assignment is None:
        raise LookupError("Company assignment not found")

    db.delete(assignment)
    db.commit()
