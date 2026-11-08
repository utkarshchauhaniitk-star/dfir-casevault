import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# Base configuration for Pydantic v2
class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# --- CASE SCHEMAS ---
class CaseBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    incident_type: str = Field(..., max_length=100)
    priority: str = Field(default="Medium", pattern="^(Low|Medium|High|Critical)$")
    status: str = Field(default="Open", pattern="^(Open|In Progress|Under Review|Closed)$")
    investigator: str = Field(default="Lead Forensic Investigator", max_length=150)
    incident_date: Optional[datetime.datetime] = None

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    incident_type: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(Low|Medium|High|Critical)$")
    status: Optional[str] = Field(None, pattern="^(Open|In Progress|Under Review|Closed)$")
    investigator: Optional[str] = None
    incident_date: Optional[datetime.datetime] = None

class CaseResponse(CaseBase, ORMModel):
    id: int
    case_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    evidence_count: Optional[int] = 0
    notes_count: Optional[int] = 0

# --- EVIDENCE SCHEMAS ---
class EvidenceBase(BaseModel):
    description: Optional[str] = None
    collection_source: str = Field(..., min_length=2, max_length=255)
    investigator: str = Field(default="Lead Forensic Investigator", max_length=150)

class EvidenceResponse(EvidenceBase, ORMModel):
    id: int
    evidence_id: str
    case_id: str
    original_filename: str
    stored_filename: str
    file_size: int
    mime_type: str
    sha256_hash: str
    collection_timestamp: datetime.datetime
    integrity_status: str
    last_verified_at: Optional[datetime.datetime] = None
    storage_location: str
    created_at: datetime.datetime

class IntegrityVerificationResponse(ORMModel):
    verification_id: str
    evidence_id: str
    recorded_hash: str
    calculated_hash: str
    status: str
    verified_by: str
    timestamp: datetime.datetime
    details: Optional[str] = None

# --- CHAIN OF CUSTODY SCHEMAS ---
class CustodyEventCreate(BaseModel):
    event_type: str
    actor: str
    description: str
    previous_custodian: Optional[str] = None
    new_custodian: Optional[str] = None

class CustodyEventResponse(ORMModel):
    id: int
    event_id: str
    case_id: str
    evidence_id: str
    event_type: str
    actor: str
    timestamp: datetime.datetime
    description: str
    previous_custodian: Optional[str] = None
    new_custodian: Optional[str] = None
    sha256_hash: str

# --- FORENSIC ANALYSIS & IOC SCHEMAS ---
class IOCResponse(ORMModel):
    id: int
    ioc_id: str
    analysis_id: str
    case_id: str
    ioc_type: str
    value: str
    context: Optional[str] = None
    status: str
    created_at: datetime.datetime

class AnalysisResultResponse(ORMModel):
    id: int
    analysis_id: str
    evidence_id: str
    case_id: str
    file_type: str
    file_size: int
    sha256_hash: str
    summary: str
    metadata_json: Optional[str] = None
    created_at: datetime.datetime
    iocs: List[IOCResponse] = []

# --- INVESTIGATION NOTES SCHEMAS ---
class NoteCreate(BaseModel):
    evidence_id: Optional[str] = None
    author: str = Field(default="Lead Forensic Investigator", max_length=150)
    title: str = Field(..., min_length=2, max_length=255)
    content: str = Field(..., min_length=3)

class NoteResponse(ORMModel):
    id: int
    note_id: str
    case_id: str
    evidence_id: Optional[str] = None
    author: str
    title: str
    content: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

# --- REPORT SCHEMAS ---
class ReportCreate(BaseModel):
    report_type: str = Field(
        default="Full Investigation Report",
        pattern="^(Case Summary|Evidence Inventory|Chain of Custody Report|Investigation Timeline|Full Investigation Report)$"
    )
    title: Optional[str] = None

class ReportResponse(ORMModel):
    id: int
    report_id: str
    case_id: str
    title: str
    report_type: str
    generated_by: str
    file_size: int
    created_at: datetime.datetime
    download_url: Optional[str] = None

# --- TIMELINE SCHEMAS ---
class TimelineEvent(BaseModel):
    event_id: str
    timestamp: datetime.datetime
    event_type: str  # Case Created, Evidence Ingested, Integrity Check, Custody Event, Note Added, Analysis Performed
    title: str
    description: str
    source: str      # System, Custody, Analysis, Investigator Note
    case_id: str
    evidence_id: Optional[str] = None
    actor: Optional[str] = None

# --- DASHBOARD STATS SCHEMAS ---
class DashboardStats(BaseModel):
    total_cases: int
    open_cases: int
    in_progress_cases: int
    closed_cases: int
    total_evidence: int
    verified_evidence: int
    unverified_evidence: int
    mismatch_evidence: int
    recent_cases: List[CaseResponse]
    recent_evidence: List[EvidenceResponse]
    recent_events: List[TimelineEvent]
    cases_by_status: List[Dict[str, Any]]
    cases_by_priority: List[Dict[str, Any]]
    evidence_by_type: List[Dict[str, Any]]
