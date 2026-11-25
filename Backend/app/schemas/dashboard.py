
from datetime import datetime

from pydantic import BaseModel


class DashboardOverview(BaseModel):
    total_jobs: int
    active_jobs: int
    total_applicants: int
    total_interviews: int
    scheduled_interviews: int
    completed_interviews: int
    cancelled_interviews: int


class ApplicantStatusCount(BaseModel):
    status: str
    count: int


class RecentApplicant(BaseModel):
    id: int
    full_name: str
    email: str
    status: str
    job_title: str
    applied_at: datetime


class UpcomingInterview(BaseModel):
    id: int
    applicant_name: str
    job_title: str
    interviewer_name: str
    interview_round: str
    scheduled_at: datetime
    duration_minutes: int
    interview_type: str


class DashboardResponse(BaseModel):
    overview: DashboardOverview
    applicants_by_status: list[ApplicantStatusCount]
    recent_applicants: list[RecentApplicant]
    upcoming_interviews: list[UpcomingInterview]
