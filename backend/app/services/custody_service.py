import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.all_models import CustodyEvent

def generate_custody_event_id() -> str:
    unique_suffix = uuid.uuid4().hex[:8].upper()
    return f"COC-{unique_suffix}"

def log_custody_event(
    db: Session,
    case_id: str,
    evidence_id: str,
    event_type: str,
    actor: str,
    description: str,
    sha256_hash: str,
    previous_custodian: Optional[str] = None,
    new_custodian: Optional[str] = None
) -> CustodyEvent:
    event_id = generate_custody_event_id()
    event = CustodyEvent(
        event_id=event_id,
        case_id=case_id,
        evidence_id=evidence_id,
        event_type=event_type,
        actor=actor,
        description=description,
        previous_custodian=previous_custodian,
        new_custodian=new_custodian,
        sha256_hash=sha256_hash,
        timestamp=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def get_custody_for_evidence(db: Session, evidence_id: str) -> List[CustodyEvent]:
    return db.query(CustodyEvent).filter(
        CustodyEvent.evidence_id == evidence_id
    ).order_by(CustodyEvent.timestamp.asc()).all()

def get_custody_for_case(db: Session, case_id: str) -> List[CustodyEvent]:
    return db.query(CustodyEvent).filter(
        CustodyEvent.case_id == case_id
    ).order_by(CustodyEvent.timestamp.asc()).all()
