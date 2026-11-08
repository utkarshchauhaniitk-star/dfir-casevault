from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.all_schemas import CustodyEventCreate, CustodyEventResponse
from app.services.custody_service import (
    get_custody_for_evidence,
    get_custody_for_case,
    log_custody_event
)
from app.services.evidence_service import get_evidence

router = APIRouter(tags=["Chain of Custody"])

@router.get("/api/evidence/{evidence_id}/custody", response_model=List[CustodyEventResponse])
def get_evidence_custody(evidence_id: str, db: Session = Depends(get_db)):
    return get_custody_for_evidence(db, evidence_id)

@router.get("/api/cases/{case_id}/custody", response_model=List[CustodyEventResponse])
def get_case_custody(case_id: str, db: Session = Depends(get_db)):
    return get_custody_for_case(db, case_id)

@router.post("/api/cases/{case_id}/evidence/{evidence_id}/custody", response_model=CustodyEventResponse, status_code=status.HTTP_201_CREATED)
def record_custody_transfer(
    case_id: str,
    evidence_id: str,
    event_in: CustodyEventCreate,
    db: Session = Depends(get_db)
):
    ev = get_evidence(db, evidence_id)
    if not ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence '{evidence_id}' not found."
        )

    event = log_custody_event(
        db=db,
        case_id=case_id,
        evidence_id=evidence_id,
        event_type=event_in.event_type,
        actor=event_in.actor,
        description=event_in.description,
        sha256_hash=ev.sha256_hash,
        previous_custodian=event_in.previous_custodian,
        new_custodian=event_in.new_custodian
    )
    return event
