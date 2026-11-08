from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.all_schemas import TimelineEvent
from app.services.timeline_service import get_case_timeline

router = APIRouter(tags=["Timeline"])

@router.get("/api/cases/{case_id}/timeline", response_model=List[TimelineEvent])
def get_timeline_for_case(
    case_id: str,
    event_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(150, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return get_case_timeline(
        db=db,
        case_id=case_id,
        event_type=event_type,
        search=search,
        limit=limit
    )

@router.get("/api/timeline", response_model=List[TimelineEvent])
def get_global_timeline(
    event_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(150, ge=1, le=500),
    db: Session = Depends(get_db)
):
    return get_case_timeline(
        db=db,
        case_id=None,
        event_type=event_type,
        search=search,
        limit=limit
    )
