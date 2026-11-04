from sqlalchemy import select
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