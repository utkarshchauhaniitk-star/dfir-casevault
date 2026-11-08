from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.all_schemas import NoteCreate, NoteResponse
from app.services.note_service import create_note, list_case_notes

router = APIRouter(tags=["Investigation Notes"])

@router.get("/api/cases/{case_id}/notes", response_model=List[NoteResponse])
def get_case_notes(case_id: str, db: Session = Depends(get_db)):
    return list_case_notes(db, case_id)

@router.post("/api/cases/{case_id}/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def add_case_note(case_id: str, note_in: NoteCreate, db: Session = Depends(get_db)):
    return create_note(db, case_id, note_in)
