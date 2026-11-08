from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.models.all_models import Case, Evidence, CustodyEvent
from app.schemas.all_schemas import DashboardStats, CaseResponse, EvidenceResponse, TimelineEvent
from app.services.timeline_service import get_case_timeline

def get_dashboard_metrics(db: Session) -> DashboardStats:
    total_cases = db.query(Case).count()
    open_cases = db.query(Case).filter(Case.status == "Open").count()
    in_progress_cases = db.query(Case).filter(Case.status == "In Progress").count()
    closed_cases = db.query(Case).filter(Case.status == "Closed").count()

    total_evidence = db.query(Evidence).count()
    verified_evidence = db.query(Evidence).filter(Evidence.integrity_status == "Verified").count()
    unverified_evidence = db.query(Evidence).filter(Evidence.integrity_status == "Unverified").count()
    mismatch_evidence = db.query(Evidence).filter(Evidence.integrity_status.in_(["Integrity Mismatch", "File Missing", "Verification Error"])).count()

    recent_cases_query = db.query(Case).order_by(desc(Case.created_at)).limit(5).all()
    recent_cases = []
    for c in recent_cases_query:
        c_resp = CaseResponse.model_validate(c)
        c_resp.evidence_count = len(c.evidence_items)
        c_resp.notes_count = len(c.notes)
        recent_cases.append(c_resp)

    recent_evidence_query = db.query(Evidence).order_by(desc(Evidence.created_at)).limit(5).all()
    recent_evidence = [EvidenceResponse.model_validate(e) for e in recent_evidence_query]

    recent_events = get_case_timeline(db, limit=10)

    # Status distribution
    status_counts = db.query(Case.status, func.count(Case.id)).group_by(Case.status).all()
    cases_by_status = [{"status": s, "count": cnt} for s, cnt in status_counts] or [
        {"status": "Open", "count": 0},
        {"status": "In Progress", "count": 0},
        {"status": "Under Review", "count": 0},
        {"status": "Closed", "count": 0}
    ]

    # Priority distribution
    priority_counts = db.query(Case.priority, func.count(Case.id)).group_by(Case.priority).all()
    cases_by_priority = [{"priority": p, "count": cnt} for p, cnt in priority_counts] or [
        {"priority": "Low", "count": 0},
        {"priority": "Medium", "count": 0},
        {"priority": "High", "count": 0},
        {"priority": "Critical", "count": 0}
    ]

    # Evidence by type / extension
    evidence_items = db.query(Evidence.original_filename).all()
    ext_map = {}
    for (fname,) in evidence_items:
        ext = fname.rsplit(".", 1)[-1].upper() if "." in fname else "RAW"
        ext_map[ext] = ext_map.get(ext, 0) + 1
    evidence_by_type = [{"file_type": k, "count": v} for k, v in ext_map.items()]

    return DashboardStats(
        total_cases=total_cases,
        open_cases=open_cases,
        in_progress_cases=in_progress_cases,
        closed_cases=closed_cases,
        total_evidence=total_evidence,
        verified_evidence=verified_evidence,
        unverified_evidence=unverified_evidence,
        mismatch_evidence=mismatch_evidence,
        recent_cases=recent_cases,
        recent_evidence=recent_evidence,
        recent_events=recent_events,
        cases_by_status=cases_by_status,
        cases_by_priority=cases_by_priority,
        evidence_by_type=evidence_by_type
    )
