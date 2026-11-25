
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models import Applicant, Interview, Job, User, UserCompany


ELIGIBLE_APPLICANT_STATUSES = {"shortlisted", "interview"}


def get_applicant_for_interview(
    db: Session,
    applicant_id: int,
):
    return db.scalar(
        select(Applicant)
        .options(
            joinedload(Applicant.job)
        )
        .where(Applicant.id == applicant_id)
    )


def get_company_interviewer(
    db: Session,
    interviewer_id: int,
    company_id: int,
):
    return db.scalar(
        select(User)
        .join(UserCompany, UserCompany.user_id == User.id)
        .where(
            User.id == interviewer_id,
            User.is_active.is_(True),
            UserCompany.company_id == company_id,
            UserCompany.is_active.is_(True),
        )
    )


def create_interview(
    db: Session,
    interview_data: dict,
) -> Interview:
    interview = Interview(**interview_data)

    try:
        db.add(interview)

        # Move shortlisted applicants into the interview stage.
        applicant = db.get(Applicant, interview.applicant_id)

        if applicant and applicant.status == "shortlisted":
            applicant.status = "interview"

        db.commit()
        db.refresh(interview)

    except Exception:
        db.rollback()
        raise

    return get_interview_by_id(db, interview.id)


def get_interview_by_id(
    db: Session,
    interview_id: int,
) -> Interview | None:
    return db.scalar(
        select(Interview)
        .options(
            joinedload(Interview.applicant)
            .joinedload(Applicant.job)
            .joinedload(Job.company),
            joinedload(Interview.interviewer),
        )
        .where(Interview.id == interview_id)
    )


def get_interviews(
    db: Session,
    current_user: User,
    company_id: int | None = None,
    applicant_id: int | None = None,
    interview_status: str | None = None,
):
    query = (
        select(Interview)
        .join(Applicant, Interview.applicant_id == Applicant.id)
        .join(Job, Applicant.job_id == Job.id)
        .options(
            joinedload(Interview.applicant)
            .joinedload(Applicant.job)
            .joinedload(Job.company),
            joinedload(Interview.interviewer),
        )
    )

    if current_user.global_role != "super_admin":
        company_access = select(UserCompany.user_id).where(
            UserCompany.user_id == current_user.id,
            UserCompany.company_id == Job.company_id,
            UserCompany.is_active.is_(True),
            UserCompany.role.in_(["admin", "hr"]),
        ).exists()

        query = query.where(
            or_(
                company_access,
                Interview.interviewer_id == current_user.id,
            )
        )

    if company_id is not None:
        query = query.where(Job.company_id == company_id)

    if applicant_id is not None:
        query = query.where(
            Interview.applicant_id == applicant_id
        )

    if interview_status is not None:
        query = query.where(
            Interview.status == interview_status
        )

    query = query.order_by(Interview.scheduled_at.desc())

    return db.scalars(query).unique().all()


def update_interview(
    db: Session,
    interview: Interview,
    update_data: dict,
) -> Interview:
    try:
        for field, value in update_data.items():
            setattr(interview, field, value)

        db.commit()
        db.refresh(interview)

    except Exception:
        db.rollback()
        raise

    return get_interview_by_id(db, interview.id)
