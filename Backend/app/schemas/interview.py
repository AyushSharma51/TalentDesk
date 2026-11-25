
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InterviewCreate(BaseModel):
    applicant_id: int
    interviewer_id: int
    interview_round: str
    scheduled_at: datetime

    duration_minutes: int = Field(default=30, gt=0)
    interview_type: str = "online"
    meeting_link: str | None = None
    remarks: str | None = None


class InterviewUpdate(BaseModel):
    interviewer_id: int | None = None
    interview_round: str | None = None
    scheduled_at: datetime | None = None

    duration_minutes: int | None = Field(default=None, gt=0)
    interview_type: str | None = None
    meeting_link: str | None = None
    remarks: str | None = None

    status: str | None = None

    rating: int | None = Field(default=None, ge=1, le=5)
    technical_rating: int | None = Field(default=None, ge=1, le=5)
    communication_rating: int | None = Field(default=None, ge=1, le=5)
    problem_solving_rating: int | None = Field(default=None, ge=1, le=5)

    strengths: str | None = None
    weaknesses: str | None = None
    feedback: str | None = None

    recommendation: str | None = None


class InterviewResponse(BaseModel):
    id: int
    applicant_id: int
    interviewer_id: int

    interview_round: str
    scheduled_at: datetime
    duration_minutes: int
    interview_type: str
    meeting_link: str | None
    remarks: str | None

    status: str

    rating: int | None
    technical_rating: int | None
    communication_rating: int | None
    problem_solving_rating: int | None

    strengths: str | None
    weaknesses: str | None
    feedback: str | None

    recommendation: str | None

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
