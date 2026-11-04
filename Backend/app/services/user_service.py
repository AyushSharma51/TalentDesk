from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import Company, User, UserCompany
from app.schemas.user import (
    UserCreate,
    UserUpdate,
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


def list_company_users(
    db: Session,
    company_id: int,
    is_active: bool | None = None,
) -> list[User]:

    statement = (
        select(User)
        .join(UserCompany, UserCompany.user_id == User.id)
        .where(
            UserCompany.company_id == company_id,
            UserCompany.is_active.is_(True),
        )
        .options(
            selectinload(User.company_assignments).selectinload(
                UserCompany.company
            )
        )
        .distinct()
    )

    if is_active is not None:
        statement = statement.where(User.is_active == is_active)

    return list(db.scalars(statement.order_by(User.id)).all())


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

    # 1. Check whether the email is already registered.
    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user:
        raise ValueError("Email is already registered")

    # 2. Verify that the selected company exists.
    company = db.get(Company, user_data.company_id)

    if company is None:
        raise LookupError("Company not found")

    # 3. Create the user without committing yet.
    user = User(
        full_name=user_data.full_name,
        email=email,
        password_hash=password_hash.hash(user_data.password),
        is_active=True,
    )

    try:
        db.add(user)

        # Obtain the generated user ID before creating the assignment.
        db.flush()

        # 4. Assign the new user to the selected company.
        assignment = UserCompany(
            user_id=user.id,
            company_id=user_data.company_id,
            role=user_data.role,
        )

        db.add(assignment)

        # 5. Commit both changes together.
        db.commit()

        # 6. Return the user with company details loaded.
        return get_user(db, user.id)

    except IntegrityError as exc:
        db.rollback()
        raise ValueError(
            "Could not create user. Check whether the email "
            "is already registered or the company assignment is valid."
        ) from exc

    except Exception:
        db.rollback()
        raise



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

    if not assignment.is_active:
        raise LookupError("Active company assignment not found")

    assignment.is_active = False

    db.commit()
    db.refresh(assignment)





def restore_company_assignment(
    db: Session,
    user_id: int,
    company_id: int,
) -> UserCompany:
    assignment = db.get(UserCompany, (user_id, company_id))

    if assignment is None:
        raise LookupError("Company assignment not found")

    if assignment.is_active:
        raise ValueError("User is already active in this company")

    user = db.get(User, user_id)

    if user is None:
        raise LookupError("User not found")

    if not user.is_active:
        raise ValueError("Cannot restore an inactive user account")

    assignment.is_active = True
    db.commit()
    db.refresh(assignment)

    return assignment


def list_inactive_company_assignments(
    db: Session,
    company_id: int,
) -> list[UserCompany]:
    statement = (
        select(UserCompany)
        .join(User, UserCompany.user_id == User.id)
        .where(
            UserCompany.company_id == company_id,
            UserCompany.is_active.is_(False),
        )
        .options(
            selectinload(UserCompany.user),
            selectinload(UserCompany.company),
        )
        .order_by(User.full_name)
    )

    return list(db.scalars(statement).all())
