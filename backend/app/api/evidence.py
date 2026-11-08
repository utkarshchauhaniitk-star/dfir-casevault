from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.all_schemas import EvidenceResponse, IntegrityVerificationResponse
from app.services.evidence_service import (
    ingest_evidence,
    get_evidence,
    list_case_evidence,
    list_all_evidence,
    verify_evidence_integrity
)
from app.core.security import resolve_safe_storage_path

router = APIRouter(tags=["Evidence"])

@router.get("/api/evidence", response_model=List[EvidenceResponse])
def get_all_evidence(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return list_all_evidence(db, skip=skip, limit=limit)

@router.get("/api/cases/{case_id}/evidence", response_model=List[EvidenceResponse])
def get_case_evidence(case_id: str, db: Session = Depends(get_db)):
    return list_case_evidence(db, case_id)

@router.post("/api/cases/{case_id}/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    case_id: str,
    file: UploadFile = File(...),
    collection_source: str = Form(...),
    investigator: str = Form("Lead Forensic Investigator"),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    evidence = await ingest_evidence(
        db=db,
        case_id=case_id,
        file=file,
        collection_source=collection_source,
        investigator=investigator,
        description=description
    )
    return evidence

@router.get("/api/evidence/{evidence_id}", response_model=EvidenceResponse)
def get_single_evidence(evidence_id: str, db: Session = Depends(get_db)):
    ev = get_evidence(db, evidence_id)
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence '{evidence_id}' not found."
        )
    return ev

@router.get("/api/evidence/{evidence_id}/download")
def download_evidence_file(evidence_id: str, db: Session = Depends(get_db)):
    ev = get_evidence(db, evidence_id)
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence '{evidence_id}' not found."
        )

    file_path = resolve_safe_storage_path(ev.stored_filename)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Artifact file is missing from evidence storage."
        )

    return FileResponse(
        path=str(file_path),
        filename=ev.original_filename,
        media_type=ev.mime_type
    )

@router.post("/api/evidence/{evidence_id}/verify", response_model=IntegrityVerificationResponse)
def trigger_integrity_verification(evidence_id: str, db: Session = Depends(get_db)):
    verification, _ = verify_evidence_integrity(db, evidence_id)
    return verification
