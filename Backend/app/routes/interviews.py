
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import Interview, User, UserCompany
from app.schemas.interview import (
    InterviewCreate,
    InterviewUpdate,
    InterviewResponse,
)
from app.services import interview_service


router = APIRouter(prefix="/interviews", tags=["Interviews"])


ALLOWED_STATUSES = {"scheduled", "completed", "cancelled"}
ALLOWED_INTERVIEW_TYPES = {"online", "offline"}
ALLOWED_RECOMMENDATIONS = {"proceed", "hold", "reject"}

FEEDBACK_FIELDS = {
    "status",
    "rating",
    "technical_rating",
    "communication_rating",
    "problem_solving_rating",
    "strengths",
    "weaknesses",
    "feedback",
    "recommendation",
}


def ensure_company_management_access(
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
            UserCompany.is_active.is_(True),
            UserCompany.role.in_(["admin", "hr"]),
        )
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage interviews for this company",
        )


def ensure_interview_access(
    db: Session,
    current_user: User,
    interview: Interview,
) -> None:
    if current_user.global_role == "super_admin":
        return

    company_id = interview.applicant.job.company_id

    assignment = db.scalar(
        select(UserCompany).where(
            UserCompany.user_id == current_user.id,
            UserCompany.company_id == company_id,
            UserCompany.is_active.is_(True),
            UserCompany.role.in_(["admin", "hr"]),
        )
    )

    if assignment is not None:
        return

    if interview.interviewer_id == current_user.id:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to access this interview",
    )


def is_company_manager(
    db: Session,
    current_user: User,
    company_id: int,
) -> bool:
    if current_user.global_role == "super_admin":
        return True

    assignment = db.scalar(
        select(UserCompany).where(
            UserCompany.user_id == current_user.id,
            UserCompany.company_id == company_id,
            UserCompany.is_active.is_(True),
            UserCompany.role.in_(["admin", "hr"]),
        )
    )

    return assignment is not None


@router.post(
    "/",
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_interview(
    interview_data: InterviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applicant = interview_service.get_applicant_for_interview(
        db=db,
        applicant_id=interview_data.applicant_id,
    )

    if applicant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant not found",
        )

    # Only shortlisted or already-interviewing applicants are eligible.
    if applicant.status not in interview_service.ELIGIBLE_APPLICANT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "An interview can only be scheduled for applicants "
                "with shortlisted or interview status."
            ),
        )

    company_id = applicant.job.company_id

    ensure_company_management_access(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    interviewer = interview_service.get_company_interviewer(
        db=db,
        interviewer_id=interview_data.interviewer_id,
        company_id=company_id,
    )

    if interviewer is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected interviewer is not an active member of this company",
        )

    if interview_data.duration_minutes <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview duration must be greater than zero",
        )

    if interview_data.interview_type not in ALLOWED_INTERVIEW_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview type",
        )

    return interview_service.create_interview(
        db=db,
        interview_data=interview_data.model_dump(),
    )


@router.get("/", response_model=list[InterviewResponse])
def list_interviews(
    company_id: int | None = Query(default=None, gt=0),
    applicant_id: int | None = Query(default=None, gt=0),
    interview_status: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if interview_status is not None and interview_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview status",
        )

    if company_id is not None:
        ensure_company_management_access(
            db=db,
            current_user=current_user,
            company_id=company_id,
        )

    return interview_service.get_interviews(
        db=db,
        current_user=current_user,
        company_id=company_id,
        applicant_id=applicant_id,
        interview_status=interview_status,
    )


@router.get("/{interview_id}", response_model=InterviewResponse)
def get_interview(
    interview_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = interview_service.get_interview_by_id(
        db=db,
        interview_id=interview_id,
    )

    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    ensure_interview_access(db, current_user, interview)

    return interview


@router.patch(
    "/{interview_id}",
    response_model=InterviewResponse,
)
def update_interview(
    interview_id: int,
    interview_data: InterviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    interview = interview_service.get_interview_by_id(
        db=db,
        interview_id=interview_id,
    )

    if interview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found",
        )

    ensure_interview_access(db, current_user, interview)

    update_data = interview_data.model_dump(exclude_unset=True)

    manager = is_company_manager(
        db=db,
        current_user=current_user,
        company_id=interview.applicant.job.company_id,
    )

    # Interviewers may submit feedback and update interview status.
    if not manager and not set(update_data).issubset(FEEDBACK_FIELDS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Interviewers can only update interview status and evaluation fields",
        )

    required_fields = {
        "interviewer_id",
        "interview_round",
        "scheduled_at",
        "duration_minutes",
        "interview_type",
        "status",
    }

    for field in required_fields:
        if field in update_data and update_data[field] is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{field} cannot be null",
            )

    if "status" in update_data and update_data["status"] not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview status",
        )

    if "interview_type" in update_data and update_data["interview_type"] not in ALLOWED_INTERVIEW_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview type",
        )

    rating_fields = {
        "rating",
        "technical_rating",
        "communication_rating",
        "problem_solving_rating",
    }

    for field in rating_fields:
        if field in update_data:
            value = update_data[field]

            if value is not None and not 1 <= value <= 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{field} must be between 1 and 5",
                )

    if "recommendation" in update_data:
        recommendation = update_data["recommendation"]

        if recommendation is not None and recommendation not in ALLOWED_RECOMMENDATIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recommendation must be proceed, hold, or reject",
            )

    if "duration_minutes" in update_data and update_data["duration_minutes"] <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview duration must be greater than zero",
        )

    if "interviewer_id" in update_data:
        new_interviewer = interview_service.get_company_interviewer(
            db=db,
            interviewer_id=update_data["interviewer_id"],
            company_id=interview.applicant.job.company_id,
        )

        if new_interviewer is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The selected interviewer is not an active member of this company",
            )

    return interview_service.update_interview(
        db=db,
        interview=interview,
        update_data=update_data,
    )
