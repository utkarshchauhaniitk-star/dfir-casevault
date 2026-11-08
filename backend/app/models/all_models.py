import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base

def utcnow():
    return datetime.datetime.now(datetime.timezone.utc)

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    incident_type = Column(String(100), nullable=False, index=True)
    priority = Column(String(50), nullable=False, default="Medium", index=True)
    status = Column(String(50), nullable=False, default="Open", index=True)
    investigator = Column(String(150), nullable=False, default="Lead Forensic Investigator")
    incident_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    notes = relationship("InvestigationNote", back_populates="case", cascade="all, delete-orphan")
    custody_events = relationship("CustodyEvent", back_populates="case", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="case", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="case", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String(50), unique=True, index=True, nullable=False)
    case_id = Column(String(50), ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(120), nullable=False, default="application/octet-stream")
    sha256_hash = Column(String(64), nullable=False, index=True)  # Recorded original hash
    description = Column(Text, nullable=True)
    collection_source = Column(String(255), nullable=False)
    investigator = Column(String(150), nullable=False)
    collection_timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    integrity_status = Column(String(50), nullable=False, default="Unverified", index=True)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    storage_location = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    case = relationship("Case", back_populates="evidence_items")
    custody_events = relationship("CustodyEvent", back_populates="evidence", cascade="all, delete-orphan")
    verifications = relationship("IntegrityVerification", back_populates="evidence", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="evidence", cascade="all, delete-orphan")
    notes = relationship("InvestigationNote", back_populates="evidence")


class CustodyEvent(Base):
    __tablename__ = "custody_events"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(50), unique=True, index=True, nullable=False)
    case_id = Column(String(50), ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(50), ForeignKey("evidence.evidence_id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    actor = Column(String(150), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    description = Column(Text, nullable=False)
    previous_custodian = Column(String(150), nullable=True)
    new_custodian = Column(String(150), nullable=True)
    sha256_hash = Column(String(64), nullable=False)

    case = relationship("Case", back_populates="custody_events")
    evidence = relationship("Evidence", back_populates="custody_events")


class IntegrityVerification(Base):
    __tablename__ = "integrity_verifications"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(String(50), unique=True, index=True, nullable=False)
    evidence_id = Column(String(50), ForeignKey("evidence.evidence_id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_hash = Column(String(64), nullable=False)
    calculated_hash = Column(String(64), nullable=False)
    status = Column(String(50), nullable=False, index=True)  # Verified, Integrity Mismatch, File Missing, Verification Error
    verified_by = Column(String(150), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    details = Column(Text, nullable=True)

    evidence = relationship("Evidence", back_populates="verifications")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String(50), unique=True, index=True, nullable=False)
    evidence_id = Column(String(50), ForeignKey("evidence.evidence_id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(String(50), ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    summary = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON-encoded string
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    case = relationship("Case", back_populates="analysis_results")
    evidence = relationship("Evidence", back_populates="analysis_results")
    iocs = relationship("IOC", back_populates="analysis", cascade="all, delete-orphan")


class IOC(Base):
    __tablename__ = "iocs"

    id = Column(Integer, primary_key=True, index=True)
    ioc_id = Column(String(50), unique=True, index=True, nullable=False)
    analysis_id = Column(String(50), ForeignKey("analysis_results.analysis_id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(String(50), ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    ioc_type = Column(String(50), nullable=False, index=True)  # IPv4, Domain, URL, Email, SHA-256
    value = Column(String(255), nullable=False, index=True)
    context = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Extracted", index=True)  # Extracted, Unverified, Needs Review
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    analysis = relationship("AnalysisResult", back_populates="iocs")


class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(String(50), unique=True, index=True, nullable=False)
    case_id = Column(String(50), ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(50), ForeignKey("evidence.evidence_id", ondelete="SET NULL"), nullable=True, index=True)
    author = Column(String(150), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    case = relationship("Case", back_populates="notes")
    evidence = relationship("Evidence", back_populates="notes")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), unique=True, index=True, nullable=False)
    case_id = Column(String(50), ForeignKey("cases.case_id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    report_type = Column(String(100), nullable=False, index=True)
    generated_by = Column(String(150), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    case = relationship("Case", back_populates="reports")
