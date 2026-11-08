import uuid
import datetime
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

from app.models.all_models import Report, Case, Evidence, CustodyEvent, InvestigationNote
from app.schemas.all_schemas import ReportCreate
from app.reports.pdf_generator import generate_case_pdf_report
from app.services.timeline_service import get_case_timeline
from app.core.config import settings

def create_case_report(
    db: Session,
    case_id: str,
    report_in: ReportCreate,
    generated_by: Optional[str] = None
) -> Report:
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found."
        )

    # Gather data for report
    case_dict = {
        "case_id": case.case_id,
        "title": case.title,
        "description": case.description,
        "incident_type": case.incident_type,
        "priority": case.priority,
        "status": case.status,
        "investigator": case.investigator,
        "incident_date": case.incident_date.strftime("%Y-%m-%d %H:%M UTC") if case.incident_date else "N/A"
    }

    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    evidence_list = [
        {
            "evidence_id": e.evidence_id,
            "original_filename": e.original_filename,
            "collection_source": e.collection_source,
            "file_size": e.file_size,
            "sha256_hash": e.sha256_hash,
            "integrity_status": e.integrity_status
        }
        for e in evidence_items
    ]

    custody_items = db.query(CustodyEvent).filter(CustodyEvent.case_id == case_id).order_by(CustodyEvent.timestamp.asc()).all()
    custody_list = [
        {
            "timestamp": c.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "event_type": c.event_type,
            "actor": c.actor,
            "description": c.description,
            "sha256_hash": c.sha256_hash
        }
        for c in custody_items
    ]

    notes_items = db.query(InvestigationNote).filter(InvestigationNote.case_id == case_id).order_by(InvestigationNote.created_at.asc()).all()
    notes_list = [
        {
            "title": n.title,
            "author": n.author,
            "content": n.content,
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for n in notes_items
    ]

    timeline_data = get_case_timeline(db, case_id=case_id, limit=50)
    timeline_list = [
        {
            "timestamp": t.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "event_type": t.event_type,
            "source": t.source,
            "title": t.title,
            "description": t.description
        }
        for t in timeline_data
    ]

    report_title = report_in.title or f"{report_in.report_type} - {case.case_id}"
    pdf_path = generate_case_pdf_report(
        case_data=case_dict,
        evidence_list=evidence_list,
        custody_list=custody_list,
        notes_list=notes_list,
        timeline_events=timeline_list,
        report_type=report_in.report_type
    )

    file_size = pdf_path.stat().st_size
    report_id = f"REP-{uuid.uuid4().hex[:8].upper()}"

    report_record = Report(
        report_id=report_id,
        case_id=case_id,
        title=report_title,
        report_type=report_in.report_type,
        generated_by=generated_by or settings.DEMO_ACTOR_NAME,
        file_path=str(pdf_path),
        file_size=file_size,
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(report_record)
    db.commit()
    db.refresh(report_record)

    return report_record

def list_case_reports(db: Session, case_id: str) -> List[Report]:
    return db.query(Report).filter(Report.case_id == case_id).order_by(desc(Report.created_at)).all()

def get_report(db: Session, report_id: str) -> Optional[Report]:
    return db.query(Report).filter(Report.report_id == report_id).first()
