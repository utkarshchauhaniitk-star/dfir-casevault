# DFIR CaseVault &mdash; REST API Specification

The backend exposes an OpenAPI 3.0-compliant RESTful interface. Interactive Swagger UI is available at `/docs` and ReDoc at `/redoc`.

## Base URLs
- Local Development: `http://localhost:8000`
- Production: Configured via `VITE_API_BASE_URL`

---

## 1. System Health
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns service status, version, and database connectivity. |

---

## 2. Forensic Dashboard
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Aggregates case counts, evidence metrics, recent events, and chart distributions. |

---

## 3. Case Management
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cases` | List cases with query filters (`status`, `priority`, `incident_type`, `search`, `skip`, `limit`). |
| `POST` | `/api/cases` | Create a new investigation case (`title`, `description`, `incident_type`, `priority`, `status`, `investigator`, `incident_date`). |
| `GET` | `/api/cases/{case_id}` | Retrieve case details, evidence count, and notes count. |
| `PUT` | `/api/cases/{case_id}` | Update case attributes (status, priority, description, investigator). |
| `DELETE` | `/api/cases/{case_id}` | Permanently delete case and cascade related evidence records. |

---

## 4. Evidence Vault & Integrity
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/evidence` | List all evidence artifacts across all cases. |
| `GET` | `/api/cases/{case_id}/evidence` | List evidence artifacts belonging to a specific case. |
| `POST` | `/api/cases/{case_id}/evidence` | Ingest new evidence artifact via multipart file upload (`file`, `collection_source`, `investigator`, `description`). Computes initial SHA-256 and logs initial custody event. |
| `GET` | `/api/evidence/{evidence_id}` | Retrieve evidence metadata and integrity status. |
| `GET` | `/api/evidence/{evidence_id}/download` | Stream download original evidence file. |
| `POST` | `/api/evidence/{evidence_id}/verify` | Execute streaming SHA-256 integrity verification against stored file on disk. |

---

## 5. Chain of Custody
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/evidence/{evidence_id}/custody` | Retrieve chronological chain of custody events for an artifact. |
| `GET` | `/api/cases/{case_id}/custody` | Retrieve all chain of custody events logged across a case. |
| `POST` | `/api/cases/{case_id}/evidence/{evidence_id}/custody` | Log a custody transfer or handling action (`event_type`, `actor`, `description`, `previous_custodian`, `new_custodian`). |

---

## 6. Forensic Artifact Analysis & IOCs
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/evidence/{evidence_id}/analyze` | Trigger safe non-executing parser on evidence artifact and extract IOC candidates. |
| `GET` | `/api/evidence/{evidence_id}/analysis` | Get latest analysis result and extracted IOC list for an evidence item. |
| `GET` | `/api/cases/{case_id}/iocs` | List all extracted IOCs for a case. |
| `GET` | `/api/iocs` | List all extracted IOCs globally with `ioc_type` query filter. |

---

## 7. Chronological Investigation Timeline
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cases/{case_id}/timeline` | Retrieve chronological timeline events for a specific case with `event_type` and `search` query filters. |
| `GET` | `/api/timeline` | Retrieve global chronological timeline across all investigations. |

---

## 8. Investigation Notes
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cases/{case_id}/notes` | List investigator triage notes for a case. |
| `POST` | `/api/cases/{case_id}/notes` | Create a timestamped investigator note (`title`, `content`, `author`, optional `evidence_id`). |

---

## 9. PDF Forensic Dossiers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/cases/{case_id}/reports` | List generated PDF reports for a case. |
| `POST` | `/api/cases/{case_id}/reports` | Compile a new PDF report using ReportLab (`report_type`, optional `title`). |
| `GET` | `/api/reports/{report_id}/download` | Stream download compiled PDF file (`application/pdf`). |
