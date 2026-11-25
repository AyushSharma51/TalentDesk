
from math import ceil

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import Job
from app.schemas.job import JobCreate, JobUpdate


def create_job(db: Session, job_data: JobCreate) -> Job:
    """Create a new job."""

    new_job = Job(
        **job_data.model_dump(),
        status="draft",
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)

    return new_job


def get_job_by_id(db: Session, job_id: int) -> Job | None:
    """Get a job using its ID."""

    return db.get(Job, job_id)


def get_jobs_by_company(
    db: Session,
    company_id: int,
) -> list[Job]:
    """Get all jobs belonging to a company."""

    statement = (
        select(Job)
        .where(Job.company_id == company_id)
        .order_by(Job.created_at.desc())
    )

    return list(db.scalars(statement).all())


def list_jobs(
    db: Session,
    company_ids: list[int] | None = None,
    page: int = 1,
    page_size: int = 10,
    search: str | None = None,
    status: str | None = None,
    employment_type: str | None = None,
    work_mode: str | None = None,
    department: str | None = None,
):
    """
    Get filtered and paginated jobs.

    company_ids=None means no company restriction.
    """

    filters = []

    if company_ids is not None:
        filters.append(Job.company_id.in_(company_ids))

    if search:
        search_term = f"%{search.strip()}%"
        filters.append(
            or_(
                Job.title.ilike(search_term),
                Job.department.ilike(search_term),
                Job.location.ilike(search_term),
            )
        )

    if status:
        filters.append(Job.status == status)

    if employment_type:
        filters.append(
            Job.employment_type == employment_type
        )

    if work_mode:
        filters.append(Job.work_mode == work_mode)

    if department:
        filters.append(
            Job.department.ilike(f"%{department.strip()}%")
        )

    # Count all matching jobs before pagination.
    count_statement = (
        select(func.count())
        .select_from(Job)
        .where(*filters)
    )

    total = db.scalar(count_statement) or 0

    # Fetch only the requested page.
    statement = (
        select(Job)
        .where(*filters)
        .order_by(Job.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    jobs = list(db.scalars(statement).all())

    return {
        "items": jobs,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": ceil(total / page_size) if total else 0,
    }


def update_job(
    db: Session,
    job: Job,
    job_data: JobUpdate,
) -> Job:
    """Update job details."""

    update_data = job_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(job, field, value)

    db.commit()
    db.refresh(job)

    return job


def update_job_status(
    db: Session,
    job: Job,
    new_status: str,
) -> Job:
    """Change job status."""

    job.status = new_status

    db.commit()
    db.refresh(job)

    return job


def delete_job(db: Session, job: Job) -> None:
    """Delete a job."""

    db.delete(job)
    db.commit()
