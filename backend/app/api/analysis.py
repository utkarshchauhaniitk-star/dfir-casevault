from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.all_schemas import AnalysisResultResponse, IOCResponse
from app.services.analysis_service import (
    analyze_evidence,
    get_latest_analysis_for_evidence,
    list_case_iocs,
    list_all_iocs
)

router = APIRouter(tags=["Forensic Analysis"])

@router.post("/api/evidence/{evidence_id}/analyze", response_model=AnalysisResultResponse)
def run_artifact_analysis(evidence_id: str, db: Session = Depends(get_db)):
    analysis = analyze_evidence(db, evidence_id)
    return analysis

@router.get("/api/evidence/{evidence_id}/analysis", response_model=AnalysisResultResponse)
def get_evidence_analysis(evidence_id: str, db: Session = Depends(get_db)):
    analysis = get_latest_analysis_for_evidence(db, evidence_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No analysis record found for evidence '{evidence_id}'. Execute analysis first."
        )
    return analysis

@router.get("/api/cases/{case_id}/iocs", response_model=List[IOCResponse])
def get_case_iocs(case_id: str, db: Session = Depends(get_db)):
    return list_case_iocs(db, case_id)

@router.get("/api/iocs", response_model=List[IOCResponse])
def get_all_iocs(
    ioc_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return list_all_iocs(db, ioc_type=ioc_type, skip=skip, limit=limit)
