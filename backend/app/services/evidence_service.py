import uuid
import datetime
from pathlib import Path
from typing import List, Optional, Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.config import settings
from app.core.security import (
    sanitize_filename,
    generate_stored_filename,
    calculate_sha256_file,
    resolve_safe_storage_path
)
from app.models.all_models import Evidence, IntegrityVerification, Case
from app.services.custody_service import log_custody_event

def generate_evidence_id(db: Session, case_id: str) -> str:
    count = db.query(Evidence).filter(Evidence.case_id == case_id).count() + 1
    return f"EV-{case_id.split('-')[-1]}-{count:03d}"

async def ingest_evidence(
    db: Session,
    case_id: str,
    file: UploadFile,
    collection_source: str,
    investigator: str,
    description: Optional[str] = None
) -> Evidence:
    # Verify case exists
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' does not exist."
        )

    clean_original_name = sanitize_filename(file.filename or "unknown_evidence")
    stored_name = generate_stored_filename(clean_original_name)
    destination_path = resolve_safe_storage_path(stored_name)

    # Read and stream write safely with size limit checking
    total_bytes = 0
    with open(destination_path, "wb") as out_file:
        while chunk := await file.read(65536):
            total_bytes += len(chunk)
            if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                destination_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Uploaded file exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)} MB."
                )
            out_file.write(chunk)

    # Calculate SHA-256 of saved file
    sha256_hash = calculate_sha256_file(destination_path)
    evidence_id = generate_evidence_id(db, case_id)

    evidence = Evidence(
        evidence_id=evidence_id,
        case_id=case_id,
        original_filename=clean_original_name,
        stored_filename=stored_name,
        file_size=total_bytes,
        mime_type=file.content_type or "application/octet-stream",
        sha256_hash=sha256_hash,
        description=description or f"Forensic artifact ingested from {collection_source}",
        collection_source=collection_source,
        investigator=investigator,
        collection_timestamp=datetime.datetime.now(datetime.timezone.utc),
        integrity_status="Unverified",
        storage_location=f"evidence_storage/{stored_name}",
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    # Log initial custody event
    log_custody_event(
        db=db,
        case_id=case_id,
        evidence_id=evidence_id,
        event_type="Evidence Ingested",
        actor=investigator,
        description=f"Evidence artifact '{clean_original_name}' ingested from source '{collection_source}'. Initial SHA-256 calculated.",
        sha256_hash=sha256_hash,
        previous_custodian=collection_source,
        new_custodian=investigator
    )

    return evidence

def get_evidence(db: Session, evidence_id: str) -> Optional[Evidence]:
    return db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()

def list_case_evidence(db: Session, case_id: str) -> List[Evidence]:
    return db.query(Evidence).filter(
        Evidence.case_id == case_id
    ).order_by(desc(Evidence.created_at)).all()

def list_all_evidence(db: Session, skip: int = 0, limit: int = 100) -> List[Evidence]:
    return db.query(Evidence).order_by(desc(Evidence.created_at)).offset(skip).limit(limit).all()

def verify_evidence_integrity(
    db: Session,
    evidence_id: str,
    verified_by: Optional[str] = None
) -> Tuple[IntegrityVerification, Evidence]:
    evidence = get_evidence(db, evidence_id)
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence item '{evidence_id}' not found."
        )

    actor = verified_by or settings.DEMO_ACTOR_NAME
    verification_id = f"VER-{uuid.uuid4().hex[:8].upper()}"
    now_utc = datetime.datetime.now(datetime.timezone.utc)

    file_path = resolve_safe_storage_path(evidence.stored_filename)

    if not file_path.exists():
        ver_status = "File Missing"
        current_hash = "FILE_NOT_FOUND"
        details = f"Verification failed: Storage file '{evidence.stored_filename}' is absent from disk."
    else:
        try:
            current_hash = calculate_sha256_file(file_path)
            if current_hash.lower() == evidence.sha256_hash.lower():
                ver_status = "Verified"
                details = "Cryptographic integrity verified. Current SHA-256 matches initial ingest hash."
            else:
                ver_status = "Integrity Mismatch"
                details = f"INTEGRITY ALERT: SHA-256 mismatch detected! Expected '{evidence.sha256_hash}', got '{current_hash}'."
        except Exception as e:
            ver_status = "Verification Error"
            current_hash = "ERROR"
            details = f"Verification computation error: {str(e)}"

    # Record verification audit
    verification = IntegrityVerification(
        verification_id=verification_id,
        evidence_id=evidence_id,
        recorded_hash=evidence.sha256_hash,
        calculated_hash=current_hash,
        status=ver_status,
        verified_by=actor,
        timestamp=now_utc,
        details=details
    )
    db.add(verification)

    # Update evidence record
    evidence.integrity_status = ver_status
    evidence.last_verified_at = now_utc
    db.commit()
    db.refresh(verification)
    db.refresh(evidence)

    # Log custody event
    log_custody_event(
        db=db,
        case_id=evidence.case_id,
        evidence_id=evidence.evidence_id,
        event_type="Integrity Verified",
        actor=actor,
        description=f"Cryptographic integrity check conducted. Status: {ver_status}. {details}",
        sha256_hash=current_hash if ver_status == "Verified" else evidence.sha256_hash
    )

    return verification, evidence
