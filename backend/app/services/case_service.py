import uuid
import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.models.all_models import Case, Evidence, CustodyEvent, InvestigationNote
from app.schemas.all_schemas import CaseCreate, CaseUpdate
from app.core.config import settings

def generate_case_id(db: Session) -> str:
    year = datetime.datetime.now(datetime.timezone.utc).year
    # Count existing cases for current year
    count = db.query(Case).filter(Case.case_id.like(f"CV-{year}-%")).count() + 1
    return f"CV-{year}-{count:04d}"

def create_case(db: Session, case_in: CaseCreate) -> Case:
    case_id = generate_case_id(db)
    new_case = Case(
        case_id=case_id,
        title=case_in.title,
        description=case_in.description,
        incident_type=case_in.incident_type,
        priority=case_in.priority,
        status=case_in.status,
        investigator=case_in.investigator,
        incident_date=case_in.incident_date or datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return new_case

def get_case(db: Session, case_id: str) -> Optional[Case]:
    return db.query(Case).filter(Case.case_id == case_id).first()

def list_cases(
    db: Session,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    incident_type: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Case]:
    query = db.query(Case)

    if status and status != "All":
        query = query.filter(Case.status == status)
    if priority and priority != "All":
        query = query.filter(Case.priority == priority)
    if incident_type and incident_type != "All":
        query = query.filter(Case.incident_type == incident_type)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Case.title.ilike(search_filter),
                Case.description.ilike(search_filter),
                Case.case_id.ilike(search_filter),
                Case.investigator.ilike(search_filter)
            )
        )

    return query.order_by(desc(Case.created_at)).offset(skip).limit(limit).all()

def update_case(db: Session, case_id: str, case_update: CaseUpdate) -> Optional[Case]:
    db_case = get_case(db, case_id)
    if not db_case:
        return None

    update_data = case_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_case, field, value)

    db_case.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(db_case)
    return db_case

def delete_case(db: Session, case_id: str) -> bool:
    db_case = get_case(db, case_id)
    if not db_case:
        return False
    db.delete(db_case)
    db.commit()
    return True
