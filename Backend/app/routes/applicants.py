from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import Job, User, UserCompany
from app.schemas.applicant import (
    ApplicantDetailResponse,
    ApplicantResponse,
    ApplicantStatusUpdate,
    ApplicationStatus,
)
from app.services import applicant_service


router = APIRouter(prefix="/applicants", tags=["Applicants"])


def ensure_applicant_company_access(
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
            detail="You do not have permission to access applicants for this company",
        )


def ensure_job_belongs_to_company(
    db: Session,
    job_id: int,
    company_id: int,
) -> None:
    job_exists = db.scalar(
        select(Job.id).where(
            Job.id == job_id,
            Job.company_id == company_id,
        )
    )

    if job_exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found in this company",
        )


def build_applicant_response(applicant: object) -> ApplicantResponse:
    return ApplicantResponse(
        id=applicant.id,
        job_id=applicant.job_id,
        job_title=applicant.job.title,
        company_id=applicant.job.company_id,
        company_name=applicant.job.company.name,
        full_name=applicant.full_name,
        email=applicant.email,
        phone=applicant.phone,
        portfolio_url=applicant.portfolio_url,
        introduction=applicant.introduction,
        resume_path=applicant.resume_path,
        status=applicant.status,
        applied_at=applicant.applied_at,
    )


@router.get("/", response_model=list[ApplicantResponse])
def list_applicants(
    company_id: int | None = Query(default=None, gt=0),
    job_id: int | None = Query(default=None, gt=0),
    applicant_status: ApplicationStatus | None = Query(
        default=None,
        alias="status",
    ),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.global_role != "super_admin":
        if company_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="company_id is required",
            )

        ensure_applicant_company_access(
            db=db,
            current_user=current_user,
            company_id=company_id,
        )

    if company_id is not None and job_id is not None:
        ensure_job_belongs_to_company(
            db=db,
            job_id=job_id,
            company_id=company_id,
        )

    applicants = applicant_service.get_applicants(
        db=db,
        company_id=company_id,
        job_id=job_id,
        status=applicant_status,
        skip=skip,
        limit=limit,
    )

    return [
        build_applicant_response(applicant)
        for applicant in applicants
    ]


@router.get("/{applicant_id}", response_model=ApplicantDetailResponse)
def get_applicant(
    applicant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applicant = applicant_service.get_applicant_by_id(
        db=db,
        applicant_id=applicant_id,
    )

    if applicant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant not found",
        )

    ensure_applicant_company_access(
        db=db,
        current_user=current_user,
        company_id=applicant.job.company_id,
    )

    return build_applicant_response(applicant)


@router.patch("/{applicant_id}/status", response_model=ApplicantResponse)
def update_applicant_status(
    applicant_id: int,
    status_data: ApplicantStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    applicant = applicant_service.get_applicant_by_id(
        db=db,
        applicant_id=applicant_id,
    )

    if applicant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicant not found",
        )

    ensure_applicant_company_access(
        db=db,
        current_user=current_user,
        company_id=applicant.job.company_id,
    )

    updated_applicant = applicant_service.update_applicant_status(
        db=db,
        applicant=applicant,
        new_status=status_data.status,
    )

    return build_applicant_response(updated_applicant)