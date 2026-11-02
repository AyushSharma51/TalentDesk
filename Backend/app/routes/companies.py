from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.company import CompanyCreate, CompanyResponse, CompanyPatch
from app.services import company_service
from app.services.company_service import (
    create_company,
    get_all_companies,
    get_company_by_id,
)

router = APIRouter(prefix="/companies", tags=["Companies"])


@router.post(
    "",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_company(
    company_data: CompanyCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_company(db, company_data)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A company with this slug may already exist.",
        )


@router.get("", response_model=list[CompanyResponse])
def list_companies(db: Session = Depends(get_db)):
    return get_all_companies(db)


@router.get("/{company_id}", response_model=CompanyResponse)
def company_details(
    company_id: int,
    db: Session = Depends(get_db),
):
    company = get_company_by_id(db, company_id)

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company



@router.put("/{company_id}", response_model=CompanyResponse)
def replace_company(
    company_id: int,
    company_data: CompanyCreate,
    db: Session = Depends(get_db),
):
    try:
        company = company_service.replace_company(
            db,
            company_id,
            company_data,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A company with this slug may already exist.",
        )

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company


@router.patch("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
    company_data: CompanyPatch,
    db: Session = Depends(get_db),
):
    try:
        company = company_service.update_company(
            db,
            company_id,
            company_data,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A company with this slug may already exist.",
        )

    if company is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return company


@router.delete(
    "/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_company(
    company_id: int,
    db: Session = Depends(get_db),
):
    try:
        deleted = company_service.delete_company(
            db,
            company_id,
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This company cannot be deleted because "
                "related records still exist."
            ),
        )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    return None
