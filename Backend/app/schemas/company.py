from pydantic import BaseModel, ConfigDict, Field


class CompanyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(
        min_length=1,
        max_length=50,
        pattern=r"^[a-z0-9-]+$",
    )


class CompanyResponse(BaseModel):
    id: int
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)

class CompanyPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
        pattern=r"^[a-z0-9-]+$",
    )

