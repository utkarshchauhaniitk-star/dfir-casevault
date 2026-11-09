import io
import hashlib
from pathlib import Path
import pytest
from app.core.config import settings

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "DFIR CaseVault" in data["service"]

def test_dashboard_stats_empty_or_valid(client):
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_cases" in data
    assert "total_evidence" in data

def test_case_lifecycle(client):
    # 1. Create case
    case_payload = {
        "title": "Test Compromised Host Alpha",
        "description": "Suspected beacon activity detected on workstation alpha-01.",
        "incident_type": "Malware investigation",
        "priority": "High",
        "status": "Open",
        "investigator": "Test Lead Investigator"
    }
    create_res = client.post("/api/cases", json=case_payload)
    assert create_res.status_code == 201
    created_case = create_res.json()
    case_id = created_case["case_id"]
    assert case_id.startswith("CV-")
    assert created_case["title"] == case_payload["title"]

    # 2. Get case
    get_res = client.get(f"/api/cases/{case_id}")
    assert get_res.status_code == 200
    assert get_res.json()["case_id"] == case_id

    # 3. List cases
    list_res = client.get("/api/cases?search=Compromised")
    assert list_res.status_code == 200
    results = list_res.json()
    assert any(c["case_id"] == case_id for c in results)

    # 4. Update case status
    update_res = client.put(f"/api/cases/{case_id}", json={"status": "In Progress", "priority": "Critical"})
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "In Progress"
    assert update_res.json()["priority"] == "Critical"

def test_evidence_ingest_and_integrity_verification(client, test_storage):
    # Create parent case
    case_res = client.post("/api/cases", json={
        "title": "Integrity Test Case",
        "description": "Case for testing genuine SHA-256 integrity and tampering checks.",
        "incident_type": "Malware investigation",
        "priority": "Medium"
    })
    case_id = case_res.json()["case_id"]

    # Upload evidence
    file_bytes = b"2026-10-18 10:00:00 [ALERT] Suspicious reverse shell spawned from 198.51.100.99:4444"
    expected_sha256 = hashlib.sha256(file_bytes).hexdigest()

    upload_res = client.post(
        f"/api/cases/{case_id}/evidence",
        data={
            "collection_source": "Workstation-A memory image",
            "investigator": "Integrity QA Tester",
            "description": "Raw syslog capture"
        },
        files={"file": ("shell_log.txt", io.BytesIO(file_bytes), "text/plain")}
    )
    assert upload_res.status_code == 201
    ev_data = upload_res.json()
    evidence_id = ev_data["evidence_id"]
    assert ev_data["sha256_hash"] == expected_sha256
    assert ev_data["integrity_status"] == "Unverified"

    # Verify integrity (Initial match check)
    verify_res = client.post(f"/api/evidence/{evidence_id}/verify")
    assert verify_res.status_code == 200
    ver_data = verify_res.json()
    assert ver_data["status"] == "Verified"
    assert ver_data["calculated_hash"] == expected_sha256

    # Verify chain of custody was recorded
    coc_res = client.get(f"/api/evidence/{evidence_id}/custody")
    assert coc_res.status_code == 200
    events = coc_res.json()
    assert len(events) >= 2  # Ingested + Verified
    assert any(e["event_type"] == "Evidence Ingested" for e in events)
    assert any(e["event_type"] == "Integrity Verified" for e in events)

    # TAMPER WITH FILE ON DISK to test mismatch detection
    stored_path = Path(settings.EVIDENCE_STORAGE_DIR) / ev_data["stored_filename"]
    assert stored_path.exists()
    with open(stored_path, "wb") as f:
        f.write(b"TAMPERED EVIDENCE CONTENT - MALICIOUS MODIFICATION")

    # Verify integrity again -> MUST DETECT MISMATCH
    tamper_res = client.post(f"/api/evidence/{evidence_id}/verify")
    assert tamper_res.status_code == 200
    tamper_data = tamper_res.json()
    assert tamper_data["status"] == "Integrity Mismatch"
    assert tamper_data["recorded_hash"] == expected_sha256
    assert tamper_data["calculated_hash"] != expected_sha256

    # Original hash in evidence MUST NOT be replaced
    get_ev_res = client.get(f"/api/evidence/{evidence_id}")
    assert get_ev_res.json()["sha256_hash"] == expected_sha256
    assert get_ev_res.json()["integrity_status"] == "Integrity Mismatch"

def test_missing_evidence_file_handling(client, test_storage):
    case_res = client.post("/api/cases", json={
        "title": "Missing File Test Case",
        "description": "Checking file missing integrity detection.",
        "incident_type": "Other",
        "priority": "Low"
    })
    case_id = case_res.json()["case_id"]

    upload_res = client.post(
        f"/api/cases/{case_id}/evidence",
        data={"collection_source": "Test Device", "investigator": "QA"},
        files={"file": ("missing_target.txt", io.BytesIO(b"Ephemeral content"), "text/plain")}
    )
    ev_data = upload_res.json()
    evidence_id = ev_data["evidence_id"]

    # Delete file from storage
    stored_path = Path(settings.EVIDENCE_STORAGE_DIR) / ev_data["stored_filename"]
    if stored_path.exists():
        stored_path.unlink()

    # Trigger verify
    verify_res = client.post(f"/api/evidence/{evidence_id}/verify")
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "File Missing"

def test_forensic_artifact_analysis_and_iocs(client, test_storage):
    case_res = client.post("/api/cases", json={
        "title": "Artifact Analysis Case",
        "description": "Testing IOC extraction from raw log text.",
        "incident_type": "Unauthorized access"
    })
    case_id = case_res.json()["case_id"]

    log_content = (
        "Adversary downloaded tool from https://malicious-c2-update.xyz/payload.exe\n"
        "Connection forwarded to 198.51.100.45\n"
        "Contact drop: exfil-user@threatgroup.top\n"
        "Observed payload hash: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n"
    ).encode("utf-8")

    upload_res = client.post(
        f"/api/cases/{case_id}/evidence",
        data={"collection_source": "Sensor Gateway", "investigator": "Forensic Analyst"},
        files={"file": ("gateway_traffic.log", io.BytesIO(log_content), "text/plain")}
    )
    evidence_id = upload_res.json()["evidence_id"]

    # Run analysis
    analysis_res = client.post(f"/api/evidence/{evidence_id}/analyze")
    assert analysis_res.status_code == 200
    analysis_data = analysis_res.json()
    assert "iocs" in analysis_data
    iocs = analysis_data["iocs"]
    assert len(iocs) >= 3

    types_found = {i["ioc_type"] for i in iocs}
    assert "IPv4" in types_found
    assert "URL" in types_found
    assert "Email" in types_found
    assert "SHA-256" in types_found

def test_investigation_notes_and_timeline(client):
    case_res = client.post("/api/cases", json={
        "title": "Timeline and Notes Case",
        "description": "Verifying chronological timeline and notes ledger.",
        "incident_type": "Data exfiltration"
    })
    case_id = case_res.json()["case_id"]

    # Add Note
    note_res = client.post(
        f"/api/cases/{case_id}/notes",
        json={
            "title": "Forensic Memo: Suspicious Exfil Port",
            "content": "Port 8443 traffic confirmed anomalous compared to baseline.",
            "author": "Analyst 01"
        }
    )
    assert note_res.status_code == 201

    # Query Timeline
    timeline_res = client.get(f"/api/cases/{case_id}/timeline")
    assert timeline_res.status_code == 200
    events = timeline_res.json()
    assert len(events) >= 2  # Case created + Note Added
    event_types = [e["event_type"] for e in events]
    assert any("Case" in t for t in event_types)
    assert any("Note" in t for t in event_types)

def test_pdf_report_generation(client, test_storage):
    case_res = client.post("/api/cases", json={
        "title": "PDF Reporting Case",
        "description": "Validating real ReportLab PDF generation with actual data.",
        "incident_type": "Ransomware"
    })
    case_id = case_res.json()["case_id"]

    # Upload one evidence item
    client.post(
        f"/api/cases/{case_id}/evidence",
        data={"collection_source": "Host", "investigator": "Reporter"},
        files={"file": ("ransom_note.txt", io.BytesIO(b"Ransomware demand text"), "text/plain")}
    )

    # Generate Report
    rep_res = client.post(
        f"/api/cases/{case_id}/reports",
        json={"report_type": "Full Investigation Report", "title": "Comprehensive Incident Dossier"}
    )
    assert rep_res.status_code == 201
    rep_data = rep_res.json()
    assert rep_data["report_id"].startswith("REP-")
    assert rep_data["file_size"] > 1000  # Non-trivial PDF size

    # Download Report PDF
    dl_res = client.get(f"/api/reports/{rep_data['report_id']}/download")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert dl_res.content.startswith(b"%PDF")

def test_security_path_traversal_and_sanitization(client, test_storage):
    from fastapi import HTTPException
    from app.core.security import resolve_safe_storage_path, sanitize_filename

    # 1. Direct path traversal attempt rejection
    with pytest.raises(HTTPException) as exc_info:
        resolve_safe_storage_path("../../etc/passwd")
    assert exc_info.value.status_code == 400
    assert "illegal path traversal" in exc_info.value.detail

    # 2. Filename sanitization strips relative directory paths
    sanitized = sanitize_filename("../../../etc/shadow")
    assert sanitized == "shadow"
    assert "/" not in sanitized
    assert ".." not in sanitized

    # 3. Traversal attack via upload endpoint is safely sanitized and contained
    case_res = client.post("/api/cases", json={
        "title": "Security Defense Test Case",
        "description": "Verifying that path traversal filenames cannot escape storage.",
        "incident_type": "Other",
        "priority": "Low"
    })
    case_id = case_res.json()["case_id"]

    upload_res = client.post(
        f"/api/cases/{case_id}/evidence",
        data={"collection_source": "Adversary Upload Test", "investigator": "Security QA"},
        files={"file": ("../../../../tmp/exploit.bin", io.BytesIO(b"safe_test_bytes"), "application/octet-stream")}
    )
    assert upload_res.status_code == 201
    ev_data = upload_res.json()

    # Stored filename must not have directory traversal
    assert "/" not in ev_data["stored_filename"]
    assert "\\" not in ev_data["stored_filename"]
    assert ".." not in ev_data["stored_filename"]

    # Resolved storage path must remain strictly within evidence storage dir
    resolved_path = resolve_safe_storage_path(ev_data["stored_filename"])
    assert resolved_path.is_relative_to(Path(settings.EVIDENCE_STORAGE_DIR).resolve())
    assert resolved_path.exists()

