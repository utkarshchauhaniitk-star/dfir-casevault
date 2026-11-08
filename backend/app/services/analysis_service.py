import uuid
import json
import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

from app.core.security import resolve_safe_storage_path
from app.models.all_models import Evidence, AnalysisResult, IOC
from app.analyzers.artifact_analyzer import analyze_artifact
from app.services.custody_service import log_custody_event
from app.core.config import settings

def analyze_evidence(db: Session, evidence_id: str, actor: Optional[str] = None) -> AnalysisResult:
    evidence = db.query(Evidence).filter(Evidence.evidence_id == evidence_id).first()
    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence item '{evidence_id}' not found."
        )

    file_path = resolve_safe_storage_path(evidence.stored_filename)
    summary, metadata, ioc_list = analyze_artifact(file_path, evidence.original_filename)

    analysis_id = f"AN-{uuid.uuid4().hex[:8].upper()}"
    analysis_record = AnalysisResult(
        analysis_id=analysis_id,
        evidence_id=evidence.evidence_id,
        case_id=evidence.case_id,
        file_type=metadata.get("extension", "raw"),
        file_size=evidence.file_size,
        sha256_hash=evidence.sha256_hash,
        summary=summary,
        metadata_json=json.dumps(metadata),
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(analysis_record)

    # Save extracted IOCs
    for item in ioc_list:
        ioc_record = IOC(
            ioc_id=f"IOC-{uuid.uuid4().hex[:8].upper()}",
            analysis_id=analysis_id,
            case_id=evidence.case_id,
            ioc_type=item["ioc_type"],
            value=item["value"],
            context=item.get("context"),
            status=item.get("status", "Extracted"),
            created_at=datetime.datetime.now(datetime.timezone.utc)
        )
        db.add(ioc_record)

    db.commit()
    db.refresh(analysis_record)

    # Log chain of custody entry
    acting_user = actor or settings.DEMO_ACTOR_NAME
    log_custody_event(
        db=db,
        case_id=evidence.case_id,
        evidence_id=evidence.evidence_id,
        event_type="Artifact Analyzed",
        actor=acting_user,
        description=f"Automated forensic analysis executed. Extracted {len(ioc_list)} IOC candidates.",
        sha256_hash=evidence.sha256_hash
    )

    return analysis_record

def get_latest_analysis_for_evidence(db: Session, evidence_id: str) -> Optional[AnalysisResult]:
    return db.query(AnalysisResult).filter(
        AnalysisResult.evidence_id == evidence_id
    ).order_by(desc(AnalysisResult.created_at)).first()

def list_case_iocs(db: Session, case_id: str) -> List[IOC]:
    return db.query(IOC).filter(IOC.case_id == case_id).order_by(desc(IOC.created_at)).all()

def list_all_iocs(db: Session, ioc_type: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[IOC]:
    query = db.query(IOC)
    if ioc_type and ioc_type != "All":
        query = query.filter(IOC.ioc_type == ioc_type)
    return query.order_by(desc(IOC.created_at)).offset(skip).limit(limit).all()
