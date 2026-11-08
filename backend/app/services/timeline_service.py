import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.all_models import Case, Evidence, CustodyEvent, IntegrityVerification, InvestigationNote, AnalysisResult
from app.schemas.all_schemas import TimelineEvent

def get_case_timeline(
    db: Session,
    case_id: Optional[str] = None,
    event_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 150
) -> List[TimelineEvent]:
    events: List[TimelineEvent] = []

    # 1. Case Creation Events
    cases_query = db.query(Case)
    if case_id:
        cases_query = cases_query.filter(Case.case_id == case_id)
    cases = cases_query.all()

    for c in cases:
        if c.incident_date:
            events.append(TimelineEvent(
                event_id=f"INC-{c.case_id}",
                timestamp=c.incident_date,
                event_type="Incident Occurred",
                title=f"Incident Detected: {c.title}",
                description=f"Suspected security incident occurred. Classification: {c.incident_type} (Priority: {c.priority})",
                source="Incident Response",
                case_id=c.case_id,
                actor=c.investigator
            ))

        events.append(TimelineEvent(
            event_id=f"CASE-INIT-{c.case_id}",
            timestamp=c.created_at,
            event_type="Case Created",
            title=f"Investigation Opened: {c.case_id}",
            description=f"Formal case record initiated by {c.investigator}. Title: '{c.title}'",
            source="System",
            case_id=c.case_id,
            actor=c.investigator
        ))

    # 2. Evidence Ingestion Events
    evidence_query = db.query(Evidence)
    if case_id:
        evidence_query = evidence_query.filter(Evidence.case_id == case_id)
    evidence_items = evidence_query.all()

    for ev in evidence_items:
        events.append(TimelineEvent(
            event_id=f"EV-INGEST-{ev.evidence_id}",
            timestamp=ev.collection_timestamp,
            event_type="Evidence Ingested",
            title=f"Evidence Logged: {ev.original_filename}",
            description=f"Acquired artifact '{ev.original_filename}' ({ev.file_size} bytes) from source '{ev.collection_source}'. SHA-256: {ev.sha256_hash[:16]}...",
            source="Evidence Vault",
            case_id=ev.case_id,
            evidence_id=ev.evidence_id,
            actor=ev.investigator
        ))

    # 3. Chain of Custody Events
    coc_query = db.query(CustodyEvent)
    if case_id:
        coc_query = coc_query.filter(CustodyEvent.case_id == case_id)
    coc_events = coc_query.all()

    for coc in coc_events:
        # Avoid duplicating Evidence Ingested if already present
        if coc.event_type != "Evidence Ingested":
            events.append(TimelineEvent(
                event_id=coc.event_id,
                timestamp=coc.timestamp,
                event_type=f"Custody: {coc.event_type}",
                title=f"Custody Event ({coc.event_type})",
                description=coc.description,
                source="Chain of Custody",
                case_id=coc.case_id,
                evidence_id=coc.evidence_id,
                actor=coc.actor
            ))

    # 4. Integrity Verifications
    ver_query = db.query(IntegrityVerification).join(Evidence, IntegrityVerification.evidence_id == Evidence.evidence_id)
    if case_id:
        ver_query = ver_query.filter(Evidence.case_id == case_id)
    verifications = ver_query.all()

    for v in verifications:
        events.append(TimelineEvent(
            event_id=v.verification_id,
            timestamp=v.timestamp,
            event_type=f"Integrity {v.status}",
            title=f"Integrity Check: {v.status}",
            description=f"Verification status: {v.status}. {v.details or ''}",
            source="Integrity Engine",
            case_id=case_id or "UNKNOWN",
            evidence_id=v.evidence_id,
            actor=v.verified_by
        ))

    # 5. Forensic Analysis Results
    analysis_query = db.query(AnalysisResult)
    if case_id:
        analysis_query = analysis_query.filter(AnalysisResult.case_id == case_id)
    analyses = analysis_query.all()

    for a in analyses:
        events.append(TimelineEvent(
            event_id=a.analysis_id,
            timestamp=a.created_at,
            event_type="Forensic Analysis",
            title=f"Artifact Analyzed ({a.file_type.upper()})",
            description=f"{a.summary} Found {len(a.iocs)} IOC indicators.",
            source="Forensic Engine",
            case_id=a.case_id,
            evidence_id=a.evidence_id,
            actor="Automated Engine"
        ))

    # 6. Investigation Notes
    notes_query = db.query(InvestigationNote)
    if case_id:
        notes_query = notes_query.filter(InvestigationNote.case_id == case_id)
    notes = notes_query.all()

    for n in notes:
        events.append(TimelineEvent(
            event_id=n.note_id,
            timestamp=n.created_at,
            event_type="Investigator Note",
            title=f"Note: {n.title}",
            description=n.content[:200] + ("..." if len(n.content) > 200 else ""),
            source="Investigator Notes",
            case_id=n.case_id,
            evidence_id=n.evidence_id,
            actor=n.author
        ))

    # Filter by event_type if specified
    if event_type and event_type != "All":
        events = [e for e in events if event_type.lower() in e.event_type.lower() or event_type.lower() in e.source.lower()]

    # Filter by search term if specified
    if search:
        s_lower = search.lower()
        events = [
            e for e in events
            if s_lower in e.title.lower()
            or s_lower in e.description.lower()
            or s_lower in e.event_type.lower()
            or (e.actor and s_lower in e.actor.lower())
            or (e.evidence_id and s_lower in e.evidence_id.lower())
        ]

    # Sort chronologically descending (newest first)
    events.sort(key=lambda x: x.timestamp, reverse=True)
    return events[:limit]
