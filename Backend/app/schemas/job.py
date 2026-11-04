from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


EmploymentType = Literal[
    "internship",
    "full_time",
    "part_time",
    "contract",
    "fellowship",
]

WorkMode = Literal[
    "on_site",
    "hybrid",
    "remote",
]

JobStatus = Literal[
    "draft",
    "published",
    "closed",
]


class JobCreate(BaseModel):
    company_id: int = Field(gt=0)

    title: str = Field(min_length=2, max_length=150)
    department: str | None = Field(default=None, max_length=100)

    employment_type: EmploymentType

    location: str | None = Field(default=None, max_length=150)
    work_mode: WorkMode | None = None

    description: str | None = None
    requirements: str | None = None


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=150)
    department: str | None = Field(default=None, max_length=100)

    employment_type: EmploymentType | None = None

    location: str | None = Field(default=None, max_length=150)
    work_mode: WorkMode | None = None

    description: str | None = None
    requirements: str | None = None

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")

        return self


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int

    title: str
    department: str | None
    employment_type: EmploymentType

    location: str | None
    work_mode: WorkMode | None

    description: str | None
    requirements: str | None

    status: JobStatus
    created_at: datetime
