
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import Company, UserCompany
from app.schemas.dashboard import DashboardResponse
from app.services import dashboard_service


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/", response_model=DashboardResponse)
def get_dashboard(
    company_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get dashboard statistics.

    Super admin:
        Can view all companies or select a specific company.

    Company admin / HR:
        Must provide a company_id and have an active
        admin or hr assignment in that company.
    """

    # Super admin can access all companies.
    if current_user.global_role != "super_admin":

        if company_id is None:
            raise HTTPException(
                status_code=400,
                detail="company_id is required.",
            )

        assignment = db.scalar(
            select(UserCompany).where(
                UserCompany.user_id == current_user.id,
                UserCompany.company_id == company_id,
                UserCompany.is_active.is_(True),
                UserCompany.role.in_(["admin", "hr"]),
            )
        )

        if not assignment:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to access this company dashboard.",
            )

    # Validate the selected company for super admins too.
    if company_id is not None:
        company = db.get(Company, company_id)

        if not company:
            raise HTTPException(
                status_code=404,
                detail="Company not found.",
            )

    return dashboard_service.get_dashboard_data(
        db=db,
        company_id=company_id,
    )
