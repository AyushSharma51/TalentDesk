
from datetime import datetime
from typing import Literal

from pydantic import (
    AliasPath,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    model_validator,
)


UserRole = Literal["admin", "hr", "interviewer"]


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    email: EmailStr | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update.")

        for field_name in ("full_name", "email", "is_active"):
            if field_name in self.model_fields_set:
                if getattr(self, field_name) is None:
                    raise ValueError(f"{field_name} cannot be null.")

        return self


class UserPasswordUpdate(BaseModel):
    current_password: str | None = None
    new_password: str = Field(min_length=8, max_length=128)


class CompanyAssignmentCreate(BaseModel):
    company_id: int = Field(gt=0)
    role: UserRole = "interviewer"


class CompanyAssignmentUpdate(BaseModel):
    role: UserRole


class CompanyAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_id: int
    company_name: str = Field(validation_alias=AliasPath("company", "name"))
    role: UserRole


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    is_active: bool
    created_at: datetime
    company_assignments: list[CompanyAssignmentResponse] = Field(
        default_factory=list
    )
