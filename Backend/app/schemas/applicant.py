from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr


ApplicationStatus = Literal[
    "applied",
    "screening",
    "shortlisted",
    "interview",
    "offered",
    "hired",
    "rejected",
]


class ApplicantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    job_title: str
    company_id: int
    company_name: str
    full_name: str
    email: EmailStr
    phone: str
    portfolio_url: str | None = None
    introduction: str | None = None
    resume_path: str
    status: ApplicationStatus
    applied_at: datetime


class ApplicantStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicantDetailResponse(ApplicantResponse):
    pass