import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status

from app.models.all_models import InvestigationNote, Case
from app.schemas.all_schemas import NoteCreate

def create_note(db: Session, case_id: str, note_in: NoteCreate) -> InvestigationNote:
    case = db.query(Case).filter(Case.case_id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' does not exist."
        )

    note_id = f"NOTE-{uuid.uuid4().hex[:8].upper()}"
    new_note = InvestigationNote(
        note_id=note_id,
        case_id=case_id,
        evidence_id=note_in.evidence_id,
        author=note_in.author,
        title=note_in.title,
        content=note_in.content,
        created_at=datetime.datetime.now(datetime.timezone.utc),
        updated_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

def list_case_notes(db: Session, case_id: str) -> List[InvestigationNote]:
    return db.query(InvestigationNote).filter(
        InvestigationNote.case_id == case_id
    ).order_by(desc(InvestigationNote.created_at)).all()
