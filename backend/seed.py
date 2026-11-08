import os
import sys
import shutil
import argparse
import datetime
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import settings
from app.core.security import calculate_sha256_file, generate_stored_filename
from app.database.session import engine, SessionLocal, Base
from app.models.all_models import (
    Case, Evidence, CustodyEvent, IntegrityVerification,
    AnalysisResult, IOC, InvestigationNote, Report
)
from app.services.custody_service import log_custody_event
from app.services.evidence_service import verify_evidence_integrity
from app.services.analysis_service import analyze_evidence
from app.services.report_service import create_case_report
from app.schemas.all_schemas import ReportCreate

def reset_database():
    print("[-] Resetting database and evidence storage...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # Clean storage directory
    storage_path = settings.storage_path
    if storage_path.exists():
        for item in storage_path.iterdir():
            if item.is_file():
                item.unlink()
            elif item.is_dir():
                shutil.rmtree(item)
    (storage_path / "reports").mkdir(parents=True, exist_ok=True)
    print("[+] Database and storage reset completed.")

def seed_data():
    db = SessionLocal()
    try:
        sample_data_dir = (backend_dir.parent / "sample-data" / "evidence").resolve()
        if not sample_data_dir.exists():
            print(f"[!] Warning: Sample data directory not found at {sample_data_dir}")
            return

        print("[*] Seeding Case 1: Operation NightShade (Ransomware)...")
        case1 = Case(
            case_id="CV-2026-0001",
            title="Operation NightShade: Ransomware Incident",
            description=(
                "At 02:15 UTC, endpoint detection sensors triggered alarms on server-dmz-01 indicating "
                "mass encryption activity and volume shadow copy deletion. An adversary established an "
                "SSH foothold via stolen service account credentials and staged an automated C2 beacon "
                "before initiating file system encryption."
            ),
            incident_type="Ransomware",
            priority="Critical",
            status="Under Review",
            investigator="Lead Forensic Investigator (Demo)",
            incident_date=datetime.datetime(2026, 10, 14, 2, 11, 0, tzinfo=datetime.timezone.utc),
            created_at=datetime.datetime(2026, 10, 14, 3, 0, 0, tzinfo=datetime.timezone.utc)
        )
        db.add(case1)
        db.commit()

        print("[*] Seeding Case 2: Executive Phishing Campaign...")
        case2 = Case(
            case_id="CV-2026-0002",
            title="Executive Credential Harvesting Phishing Campaign",
            description=(
                "Targeted spear-phishing messages impersonating corporate IT security delivered to executive "
                "leadership. The emails lured victims to a sophisticated fake Microsoft 365 single sign-on "
                "portal configured to intercept MFA session tokens."
            ),
            incident_type="Phishing investigation",
            priority="High",
            status="In Progress",
            investigator="Sarah Chen, Senior DFIR Analyst",
            incident_date=datetime.datetime(2026, 10, 15, 9, 14, 0, tzinfo=datetime.timezone.utc),
            created_at=datetime.datetime(2026, 10, 15, 10, 30, 0, tzinfo=datetime.timezone.utc)
        )
        db.add(case2)
        db.commit()

        print("[*] Seeding Case 3: Cloud Data Exfiltration...")
        case3 = Case(
            case_id="CV-2026-0003",
            title="Unauthorized Cloud API Data Exfiltration",
            description=(
                "Unusual outbound egress data volume detected from VPC private subnet 10.0.4.0/24 "
                "destined for an uncatalogued foreign external IP address over port 443 during non-business hours."
            ),
            incident_type="Data exfiltration",
            priority="High",
            status="Open",
            investigator="Alex Mercer, Forensics Specialist",
            incident_date=datetime.datetime(2026, 10, 16, 14, 2, 0, tzinfo=datetime.timezone.utc),
            created_at=datetime.datetime(2026, 10, 16, 15, 0, 0, tzinfo=datetime.timezone.utc)
        )
        db.add(case3)
        db.commit()

        # Helper to ingest file safely into storage
        def ingest_sample_file(src_name: str, case_id: str, ev_id: str, source: str, desc: str, investigator: str):
            src_file = sample_data_dir / src_name
            if not src_file.exists():
                return None
            stored_name = generate_stored_filename(src_name)
            dst_file = settings.storage_path / stored_name
            shutil.copy2(src_file, dst_file)
            fsize = dst_file.stat().st_size
            sha256 = calculate_sha256_file(dst_file)

            evidence = Evidence(
                evidence_id=ev_id,
                case_id=case_id,
                original_filename=src_name,
                stored_filename=stored_name,
                file_size=fsize,
                mime_type="text/plain" if src_name.endswith(('.log', '.txt')) else ("application/json" if src_name.endswith('.json') else "text/csv"),
                sha256_hash=sha256,
                description=desc,
                collection_source=source,
                investigator=investigator,
                collection_timestamp=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=2),
                integrity_status="Unverified",
                storage_location=f"evidence_storage/{stored_name}",
                created_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=2)
            )
            db.add(evidence)
            db.commit()
            db.refresh(evidence)

            # Ingest custody event
            log_custody_event(
                db=db,
                case_id=case_id,
                evidence_id=ev_id,
                event_type="Evidence Ingested",
                actor=investigator,
                description=f"Evidence artifact '{src_name}' safely ingested into vault. Initial SHA-256 computed.",
                sha256_hash=sha256,
                previous_custodian=source,
                new_custodian=investigator
            )
            return evidence

        print("[*] Ingesting Evidence Items...")
        ev1 = ingest_sample_file(
            src_name="auth_failures.log",
            case_id="CV-2026-0001",
            ev_id="EV-0001-001",
            source="Linux DMZ Server (/var/log/auth.log)",
            desc="Authentication and syslog events showing brute-force attempts and curl payload drop.",
            investigator="Lead Forensic Investigator (Demo)"
        )

        ev2 = ingest_sample_file(
            src_name="c2_beacon_config.json",
            case_id="CV-2026-0001",
            ev_id="EV-0001-002",
            source="Memory Dump Carver (PID 14050)",
            desc="De-obfuscated JSON configuration extracted from active in-memory ransomware dropper.",
            investigator="Lead Forensic Investigator (Demo)"
        )

        ev3 = ingest_sample_file(
            src_name="phishing_email_headers.txt",
            case_id="CV-2026-0002",
            ev_id="EV-0002-001",
            source="Google Workspace Mail Audit Vault",
            desc="MIME and SMTP transport headers for phishing lure sent to CFO.",
            investigator="Sarah Chen, Senior DFIR Analyst"
        )

        ev4 = ingest_sample_file(
            src_name="exfil_network_traffic.csv",
            case_id="CV-2026-0003",
            ev_id="EV-0003-001",
            source="Palo Alto Firewall Egress Flow Logs",
            desc="Flow records demonstrating high-volume outbound transfer to external C2 node.",
            investigator="Alex Mercer, Forensics Specialist"
        )

        # Run integrity verification for ev1 and ev2
        print("[*] Performing Initial Cryptographic Integrity Verifications...")
        if ev1:
            verify_evidence_integrity(db, ev1.evidence_id, verified_by="Automated Ingest Integrity Check")
        if ev2:
            verify_evidence_integrity(db, ev2.evidence_id, verified_by="Lead Forensic Investigator (Demo)")
        if ev3:
            verify_evidence_integrity(db, ev3.evidence_id, verified_by="Sarah Chen, Senior DFIR Analyst")

        # Run automated forensic artifact analysis to extract IOCs
        print("[*] Running Forensic Artifact Analysis & IOC Extraction...")
        if ev1:
            analyze_evidence(db, ev1.evidence_id, actor="Lead Forensic Investigator (Demo)")
        if ev2:
            analyze_evidence(db, ev2.evidence_id, actor="Lead Forensic Investigator (Demo)")
        if ev3:
            analyze_evidence(db, ev3.evidence_id, actor="Sarah Chen, Senior DFIR Analyst")
        if ev4:
            analyze_evidence(db, ev4.evidence_id, actor="Alex Mercer, Forensics Specialist")

        # Add Investigation Notes
        print("[*] Adding Investigator Notes...")
        note1 = InvestigationNote(
            note_id="NOTE-8812001",
            case_id="CV-2026-0001",
            evidence_id=ev1.evidence_id if ev1 else None,
            author="Lead Forensic Investigator (Demo)",
            title="Initial Entry Vector Analysis",
            content=(
                "Analysis of auth_failures.log shows 3 failed login attempts followed by successful password "
                "entry for service_svc at 02:11:19 UTC. The service password had not been rotated in 180 days. "
                "Immediately upon access, the adversary executed curl to fetch stage2.bin from malicious-c2-update.xyz."
            ),
            created_at=datetime.datetime(2026, 10, 14, 4, 15, 0, tzinfo=datetime.timezone.utc),
            updated_at=datetime.datetime(2026, 10, 14, 4, 15, 0, tzinfo=datetime.timezone.utc)
        )
        db.add(note1)

        note2 = InvestigationNote(
            note_id="NOTE-8812002",
            case_id="CV-2026-0001",
            evidence_id=ev2.evidence_id if ev2 else None,
            author="Lead Forensic Investigator (Demo)",
            title="C2 Configuration De-obfuscation",
            content=(
                "Recovered JSON configuration from process memory confirms primary C2 domain malicious-c2-update.xyz "
                "with fallback IP 198.51.100.45:8443. Target exfiltration URL is drop.cloudstorage-exfil.xyz. "
                "Recommend immediately applying perimeter firewall blocklists."
            ),
            created_at=datetime.datetime(2026, 10, 14, 5, 30, 0, tzinfo=datetime.timezone.utc),
            updated_at=datetime.datetime(2026, 10, 14, 5, 30, 0, tzinfo=datetime.timezone.utc)
        )
        db.add(note2)

        note3 = InvestigationNote(
            note_id="NOTE-8812003",
            case_id="CV-2026-0002",
            evidence_id=ev3.evidence_id if ev3 else None,
            author="Sarah Chen, Senior DFIR Analyst",
            title="Phishing Infrastructure Takedown Notice",
            content=(
                "The phishing lure links to portal-verification-service.top. Contacted registrar abuse contact "
                "requesting immediate domain suspension. Microsoft Defender SmartScreen flag submitted."
            ),
            created_at=datetime.datetime(2026, 10, 15, 11, 45, 0, tzinfo=datetime.timezone.utc),
            updated_at=datetime.datetime(2026, 10, 15, 11, 45, 0, tzinfo=datetime.timezone.utc)
        )
        db.add(note3)
        db.commit()

        # Generate a demonstration PDF report for Case 1
        print("[*] Generating Case 1 Demonstration PDF Report...")
        create_case_report(
            db=db,
            case_id="CV-2026-0001",
            report_in=ReportCreate(
                report_type="Full Investigation Report",
                title="Full Investigation Report - Operation NightShade"
            ),
            generated_by="Lead Forensic Investigator (Demo)"
        )

        print("[+] Seeding successfully completed! 3 cases, 4 evidence items, verified hashes, IOCs, notes, and PDF reports ready.")

    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed DFIR CaseVault database with synthetic demo data.")
    parser.add_argument("--reset", action="store_true", help="Reset and wipe existing database before seeding.")
    args = parser.parse_args()

    if args.reset:
        reset_database()
    seed_data()
