
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Applicant, Interview, Job, User


def get_dashboard_data(
    db: Session,
    company_id: int | None = None,
) -> dict:
    """
    Fetch all dashboard statistics.

    If company_id is None, statistics include all companies.
    Otherwise, statistics are restricted to the selected company.
    """

    # -------------------------
    # Overview statistics
    # -------------------------

    jobs_query = select(func.count(Job.id))

    active_jobs_query = select(func.count(Job.id)).where(
        Job.status == "published"
    )

    applicants_query = (
        select(func.count(Applicant.id))
        .join(Job, Applicant.job_id == Job.id)
    )

    interviews_query = (
        select(func.count(Interview.id))
        .join(Applicant, Interview.applicant_id == Applicant.id)
        .join(Job, Applicant.job_id == Job.id)
    )

    scheduled_query = (
        select(func.count(Interview.id))
        .join(Applicant, Interview.applicant_id == Applicant.id)
        .join(Job, Applicant.job_id == Job.id)
        .where(Interview.status == "scheduled")
    )

    completed_query = (
        select(func.count(Interview.id))
        .join(Applicant, Interview.applicant_id == Applicant.id)
        .join(Job, Applicant.job_id == Job.id)
        .where(Interview.status == "completed")
    )

    cancelled_query = (
        select(func.count(Interview.id))
        .join(Applicant, Interview.applicant_id == Applicant.id)
        .join(Job, Applicant.job_id == Job.id)
        .where(Interview.status == "cancelled")
    )

    # Apply company filter to all overview queries.
    if company_id is not None:
        jobs_query = jobs_query.where(Job.company_id == company_id)

        active_jobs_query = active_jobs_query.where(
            Job.company_id == company_id
        )

        applicants_query = applicants_query.where(
            Job.company_id == company_id
        )

        interviews_query = interviews_query.where(
            Job.company_id == company_id
        )

        scheduled_query = scheduled_query.where(
            Job.company_id == company_id
        )

        completed_query = completed_query.where(
            Job.company_id == company_id
        )

        cancelled_query = cancelled_query.where(
            Job.company_id == company_id
        )

    overview = {
        "total_jobs": db.scalar(jobs_query) or 0,
        "active_jobs": db.scalar(active_jobs_query) or 0,
        "total_applicants": db.scalar(applicants_query) or 0,
        "total_interviews": db.scalar(interviews_query) or 0,
        "scheduled_interviews": db.scalar(scheduled_query) or 0,
        "completed_interviews": db.scalar(completed_query) or 0,
        "cancelled_interviews": db.scalar(cancelled_query) or 0,
    }

    # -------------------------
    # Applicants by status
    # -------------------------

    status_query = (
        select(
            Applicant.status,
            func.count(Applicant.id).label("count"),
        )
        .join(Job, Applicant.job_id == Job.id)
        .group_by(Applicant.status)
        .order_by(Applicant.status)
    )

    if company_id is not None:
        status_query = status_query.where(
            Job.company_id == company_id
        )

    status_results = db.execute(status_query).all()

    applicants_by_status = [
        {
            "status": status,
            "count": count,
        }
        for status, count in status_results
    ]

    # -------------------------
    # Recent applicants
    # -------------------------

    recent_query = (
        select(Applicant, Job.title)
        .join(Job, Applicant.job_id == Job.id)
        .order_by(Applicant.applied_at.desc())
        .limit(5)
    )

    if company_id is not None:
        recent_query = recent_query.where(
            Job.company_id == company_id
        )

    recent_results = db.execute(recent_query).all()

    recent_applicants = [
        {
            "id": applicant.id,
            "full_name": applicant.full_name,
            "email": applicant.email,
            "status": applicant.status,
            "job_title": job_title,
            "applied_at": applicant.applied_at,
        }
        for applicant, job_title in recent_results
    ]

    # -------------------------
    # Upcoming interviews
    # -------------------------

    now = datetime.now(timezone.utc)

    upcoming_query = (
        select(
            Interview.id,
            Applicant.full_name,
            Job.title,
            User.full_name,
            Interview.interview_round,
            Interview.scheduled_at,
            Interview.duration_minutes,
            Interview.interview_type,
        )
        .join(Applicant, Interview.applicant_id == Applicant.id)
        .join(Job, Applicant.job_id == Job.id)
        .join(User, Interview.interviewer_id == User.id)
        .where(
            Interview.status == "scheduled",
            Interview.scheduled_at >= now,
        )
        .order_by(Interview.scheduled_at.asc())
        .limit(5)
    )

    if company_id is not None:
        upcoming_query = upcoming_query.where(
            Job.company_id == company_id
        )

    upcoming_results = db.execute(upcoming_query).all()

    upcoming_interviews = [
        {
            "id": interview_id,
            "applicant_name": applicant_name,
            "job_title": job_title,
            "interviewer_name": interviewer_name,
            "interview_round": interview_round,
            "scheduled_at": scheduled_at,
            "duration_minutes": duration_minutes,
            "interview_type": interview_type,
        }
        for (
            interview_id,
            applicant_name,
            job_title,
            interviewer_name,
            interview_round,
            scheduled_at,
            duration_minutes,
            interview_type,
        ) in upcoming_results
    ]

    return {
        "overview": overview,
        "applicants_by_status": applicants_by_status,
        "recent_applicants": recent_applicants,
        "upcoming_interviews": upcoming_interviews,
    }
