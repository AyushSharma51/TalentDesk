
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.supabase import supabase
from app.models import Applicant, Job


BUCKET_NAME = "talentdesk-resumes"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


async def upload_resume(
    db: Session,
    job_id: int,
    file: UploadFile,
) -> str:

    # Check that the job exists and is published
    job = db.get(Job, job_id)

    if not job or job.status != "published":
        raise HTTPException(
            status_code=404,
            detail="Job not found or not accepting applications.",
        )

    # Validate file extension
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed.",
        )

    # Read maximum allowed size + 1 byte
    file_content = await file.read(MAX_FILE_SIZE + 1)

    if not file_content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Resume cannot exceed 5 MB.",
        )

    # Validate PDF signature
    if not file_content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF file.",
        )

    # Generate unique filename
    file_name = f"{uuid.uuid4()}.pdf"

    # Organize files by company
    file_path = f"company_{job.company_id}/{file_name}"

    # Upload to Supabase Storage
    try:
        supabase.storage.from_(BUCKET_NAME).upload(
            path=file_path,
            file=file_content,
            file_options={
                "content-type": "application/pdf",
                "upsert": "false",
            },
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to upload resume.",
        ) from exc

    return file_path


def generate_resume_url(
    db: Session,
    applicant_id: int,
    download: bool = False,
) -> str:

    applicant = db.get(Applicant, applicant_id)

    if not applicant:
        raise HTTPException(
            status_code=404,
            detail="Applicant not found.",
        )

    try:
        response = supabase.storage.from_(BUCKET_NAME).create_signed_url(
            path=applicant.resume_path,
            expires_in=300,
            options={"download": download},
        )

        signed_url = (
            response.get("signedURL")
            or response.get("signedUrl")
        )

        if not signed_url:
            raise HTTPException(
                status_code=500,
                detail="Could not generate resume URL.",
            )

        return signed_url

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate resume URL.",
        ) from exc
