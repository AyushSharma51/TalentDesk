from fastapi import APIRouter, Depends,Query, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import Job, User, UserCompany
from app.schemas.job import (
    JobCreate,
    JobUpdate,
    JobResponse,
    JobListResponse,
)
from app.services import job_service


router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"],
)


# --------------------------------------------------
# Permission helpers
# --------------------------------------------------

def ensure_can_view_jobs(
    db: Session,
    current_user: User,
    company_id: int,
):
    """Allow users to view jobs in their assigned company."""

    if current_user.global_role == "super_admin":
        return

    assignment = db.get(
        UserCompany,
        (current_user.id, company_id),
    )

    if (
        assignment is None
        or not assignment.is_active
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this company's jobs.",
        )


def ensure_can_manage_jobs(
    db: Session,
    current_user: User,
    company_id: int,
):
    """Allow only Super Admin, company Admin, and HR to manage jobs."""

    if current_user.global_role == "super_admin":
        return

    assignment = db.get(
        UserCompany,
        (current_user.id, company_id),
    )

    if (
        assignment is None
        or not assignment.is_active
        or assignment.role not in ("admin", "hr")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or HR can manage jobs.",
        )


# --------------------------------------------------
# Create Job
# --------------------------------------------------

@router.post(
    "/",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_job(
    job_data: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ensure_can_manage_jobs(
        db,
        current_user,
        job_data.company_id,
    )

    return job_service.create_job(db, job_data)


# --------------------------------------------------
# List Jobs
# --------------------------------------------------


# --------------------------------------------------
# List Jobs - Filtering and Pagination
# --------------------------------------------------

@router.get("/", response_model=JobListResponse)
def list_jobs(
    company_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    search: str | None = None,
    job_status: str | None = Query(default=None, alias="status"),
    employment_type: str | None = None,
    work_mode: str | None = None,
    department: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Super Admin can view jobs across all companies.
    if current_user.global_role == "super_admin":
        company_ids = [company_id] if company_id is not None else None

    else:
        # Get only active company assignments.
        assignments = db.scalars(
            select(UserCompany).where(
                UserCompany.user_id == current_user.id,
                UserCompany.is_active.is_(True),
            )
        ).all()

        assigned_company_ids = [
            assignment.company_id
            for assignment in assignments
        ]

        # Validate requested company access.
        if company_id is not None:
            if company_id not in assigned_company_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this company's jobs.",
                )

            company_ids = [company_id]
        else:
            company_ids = assigned_company_ids

    return job_service.list_jobs(
        db=db,
        company_ids=company_ids,
        page=page,
        page_size=page_size,
        search=search,
        status=job_status,
        employment_type=employment_type,
        work_mode=work_mode,
        department=department,
    )



# --------------------------------------------------
# Get Job Details
# --------------------------------------------------

@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = job_service.get_job_by_id(db, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    ensure_can_view_jobs(db, current_user, job.company_id)

    return job


# --------------------------------------------------
# Update Job
# --------------------------------------------------

@router.patch("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    job_data: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = job_service.get_job_by_id(db, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    ensure_can_manage_jobs(db, current_user, job.company_id)

    if job.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Closed jobs cannot be updated.",
        )

    return job_service.update_job(db, job, job_data)


# --------------------------------------------------
# Publish Job
# --------------------------------------------------

@router.patch("/{job_id}/publish", response_model=JobResponse)
def publish_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = job_service.get_job_by_id(db, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    ensure_can_manage_jobs(db, current_user, job.company_id)

    if job.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A closed job cannot be published again.",
        )

    return job_service.update_job_status(db, job, "published")


# --------------------------------------------------
# Close Job
# --------------------------------------------------

@router.patch("/{job_id}/close", response_model=JobResponse)
def close_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = job_service.get_job_by_id(db, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    ensure_can_manage_jobs(db, current_user, job.company_id)

    if job.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is already closed.",
        )

    return job_service.update_job_status(db, job, "closed")


# --------------------------------------------------
# Delete Draft Job
# --------------------------------------------------

@router.delete("/{job_id}")
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    job = job_service.get_job_by_id(db, job_id)

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    ensure_can_manage_jobs(db, current_user, job.company_id)

    if job.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft jobs can be deleted.",
        )

    if job.applicants:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jobs with applicants cannot be deleted.",
        )

    job_service.delete_job(db, job)

    return {"message": "Job deleted successfully."}
