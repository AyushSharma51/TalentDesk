from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Company
from app.schemas.company import CompanyCreate, CompanyPatch


def create_company(db: Session, company_data: CompanyCreate) -> Company:
    company = Company(
        name=company_data.name,
        slug=company_data.slug,
    )

    db.add(company)
    db.commit()
    db.refresh(company)

    return company


def get_all_companies(db: Session) -> list[Company]:
    statement = select(Company).order_by(Company.id)
    return list(db.scalars(statement).all())


def get_company_by_id(db: Session, company_id: int) -> Company | None:
    statement = select(Company).where(Company.id == company_id)
    return db.scalars(statement).first()



def replace_company(
    db: Session,
    company_id: int,
    company_data: CompanyCreate,
) -> Company | None:
    company = get_company_by_id(db, company_id)

    if company is None:
        return None

    company.name = company_data.name
    company.slug = company_data.slug

    db.commit()
    db.refresh(company)

    return company


def update_company(
    db: Session,
    company_id: int,
    company_data: CompanyPatch,
):
    company = db.query(Company).filter(
        Company.id == company_id
    ).first()

    if company is None:
        return None

    update_data = company_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)

    return company


def delete_company(db: Session, company_id: int):
    company = (
        db.query(Company)
        .filter(Company.id == company_id)
        .first()
    )

    if company is None:
        return False

    db.delete(company)
    db.commit()

    return True
