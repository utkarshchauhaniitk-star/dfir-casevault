from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.all_schemas import CaseCreate, CaseUpdate, CaseResponse
from app.services.case_service import (
    create_case,
    get_case,
    list_cases,
    update_case,
    delete_case
)

router = APIRouter(prefix="/api/cases", tags=["Cases"])

@router.get("", response_model=List[CaseResponse])
def get_cases(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    incident_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    cases = list_cases(
        db=db,
        status=status,
        priority=priority,
        incident_type=incident_type,
        search=search,
        skip=skip,
        limit=limit
    )
    result = []
    for c in cases:
        resp = CaseResponse.model_validate(c)
        resp.evidence_count = len(c.evidence_items)
        resp.notes_count = len(c.notes)
        result.append(resp)
    return result

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_new_case(case_in: CaseCreate, db: Session = Depends(get_db)):
    case = create_case(db, case_in)
    resp = CaseResponse.model_validate(case)
    resp.evidence_count = 0
    resp.notes_count = 0
    return resp

@router.get("/{case_id}", response_model=CaseResponse)
def get_case_by_id(case_id: str, db: Session = Depends(get_db)):
    case = get_case(db, case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found."
        )
    resp = CaseResponse.model_validate(case)
    resp.evidence_count = len(case.evidence_items)
    resp.notes_count = len(case.notes)
    return resp

@router.put("/{case_id}", response_model=CaseResponse)
def update_case_by_id(case_id: str, case_in: CaseUpdate, db: Session = Depends(get_db)):
    case = update_case(db, case_id, case_in)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found."
        )
    resp = CaseResponse.model_validate(case)
    resp.evidence_count = len(case.evidence_items)
    resp.notes_count = len(case.notes)
    return resp

@router.delete("/{case_id}")
def delete_case_by_id(case_id: str, db: Session = Depends(get_db)):
    success = delete_case(db, case_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found."
        )
    return {"message": f"Case '{case_id}' and all associated evidence/records have been deleted."}
