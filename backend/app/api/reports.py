from pathlib import Path
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.all_schemas import ReportCreate, ReportResponse
from app.services.report_service import (
    create_case_report,
    list_case_reports,
    get_report
)

router = APIRouter(tags=["Reports"])

@router.get("/api/cases/{case_id}/reports", response_model=List[ReportResponse])
def get_reports_for_case(case_id: str, db: Session = Depends(get_db)):
    reports = list_case_reports(db, case_id)
    results = []
    for r in reports:
        resp = ReportResponse.model_validate(r)
        resp.download_url = f"/api/reports/{r.report_id}/download"
        results.append(resp)
    return results

@router.post("/api/cases/{case_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_new_report(case_id: str, report_in: ReportCreate, db: Session = Depends(get_db)):
    report = create_case_report(db, case_id, report_in)
    resp = ReportResponse.model_validate(report)
    resp.download_url = f"/api/reports/{report.report_id}/download"
    return resp

@router.get("/api/reports/{report_id}/download")
def download_pdf_report(report_id: str, db: Session = Depends(get_db)):
    report = get_report(db, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found."
        )

    file_path = Path(report.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generated report PDF file was not found on disk."
        )

    return FileResponse(
        path=str(file_path),
        filename=f"{report.title.replace(' ', '_')}.pdf",
        media_type="application/pdf"
    )
