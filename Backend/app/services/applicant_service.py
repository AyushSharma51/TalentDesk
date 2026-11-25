
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Applicant, Job


def get_applicants(
    db: Session,
    company_id: int | None = None,
    job_id: int | None = None,
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
) -> list[Applicant]:

    statement = (
        select(Applicant)
        .join(Applicant.job)
        .options(
            selectinload(Applicant.job).selectinload(Job.company)
        )
    )

    if company_id is not None:
        statement = statement.where(Job.company_id == company_id)

    if job_id is not None:
        statement = statement.where(Applicant.job_id == job_id)

    if status is not None:
        statement = statement.where(Applicant.status == status)

    statement = (
        statement
        .order_by(Applicant.applied_at.desc())
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all())


def get_applicant_by_id(
    db: Session,
    applicant_id: int,
) -> Applicant | None:

    statement = (
        select(Applicant)
        .options(
            selectinload(Applicant.job).selectinload(Job.company)
        )
        .where(Applicant.id == applicant_id)
    )

    return db.scalar(statement)


def update_applicant_status(
    db: Session,
    applicant: Applicant,
    new_status: str,
) -> Applicant:

    applicant.status = new_status

    try:
        db.commit()
        db.refresh(applicant)
    except Exception:
        db.rollback()
        raise

    return applicant
