
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models import User, UserCompany, Applicant, Job

from app.services.resume_service import (
    upload_resume,
    generate_resume_url,
)


router = APIRouter(
    prefix="/resumes",
    tags=["Resumes"],
)


# --------------------------------------------------
# Check whether the HR user can access this applicant
# --------------------------------------------------

def check_resume_access(
    db: Session,
    applicant_id: int,
    current_user: User,
) -> None:

    applicant = db.get(Applicant, applicant_id)

    if not applicant:
        raise HTTPException(
            status_code=404,
            detail="Applicant not found.",
        )

    job = db.get(Job, applicant.job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found.",
        )

    # Super Admin can access all companies
    if current_user.global_role == "super_admin":
        return

    # Find user's company assignment
    assignment = db.get(
        UserCompany,
        (current_user.id, job.company_id),
    )

    if (
        assignment is None
        or not assignment.is_active
        or assignment.role not in ("admin", "hr")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this resume.",
        )


# --------------------------------------------------
# Upload Resume (Public Candidate)
# --------------------------------------------------

@router.post(
    "/upload/{job_id}",
    status_code=status.HTTP_201_CREATED,
)
async def upload_resume_route(
    job_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):

    resume_path = await upload_resume(
        db=db,
        job_id=job_id,
        file=file,
    )

    return {
        "message": "Resume uploaded successfully.",
        "resume_path": resume_path,
    }


# --------------------------------------------------
# Preview Resume (HR / Admin / Super Admin)
# --------------------------------------------------

@router.get("/{applicant_id}/preview")
def preview_resume(
    applicant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    check_resume_access(
        db=db,
        applicant_id=applicant_id,
        current_user=current_user,
    )

    signed_url = generate_resume_url(
        db=db,
        applicant_id=applicant_id,
        download=False,
    )

    return {
        "message": "Resume preview URL generated.",
        "resume_url": signed_url,
    }


# --------------------------------------------------
# Download Resume (HR / Admin / Super Admin)
# --------------------------------------------------

@router.get("/{applicant_id}/download")
def download_resume(
    applicant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    check_resume_access(
        db=db,
        applicant_id=applicant_id,
        current_user=current_user,
    )

    signed_url = generate_resume_url(
        db=db,
        applicant_id=applicant_id,
        download=True,
    )

    return {
        "message": "Resume download URL generated.",
        "resume_url": signed_url,
    }
