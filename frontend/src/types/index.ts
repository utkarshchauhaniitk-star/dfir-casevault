export type CaseStatus = 'Open' | 'In Progress' | 'Under Review' | 'Closed';
export type CasePriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type IntegrityStatus = 'Verified' | 'Integrity Mismatch' | 'File Missing' | 'Verification Error' | 'Unverified';

export interface Case {
  id: number;
  case_id: string;
  title: string;
  description: string;
  incident_type: string;
  priority: CasePriority;
  status: CaseStatus;
  investigator: string;
  incident_date?: string | null;
  created_at: string;
  updated_at: string;
  evidence_count?: number;
  notes_count?: number;
}

export interface CaseCreatePayload {
  title: string;
  description: string;
  incident_type: string;
  priority: CasePriority;
  status: CaseStatus;
  investigator: string;
  incident_date?: string;
}

export interface CaseUpdatePayload {
  title?: string;
  description?: string;
  incident_type?: string;
  priority?: CasePriority;
  status?: CaseStatus;
  investigator?: string;
  incident_date?: string;
}

export interface Evidence {
  id: number;
  evidence_id: string;
  case_id: string;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  mime_type: string;
  sha256_hash: string;
  description?: string;
  collection_source: string;
  investigator: string;
  collection_timestamp: string;
  integrity_status: IntegrityStatus;
  last_verified_at?: string | null;
  storage_location: string;
  created_at: string;
}

export interface IntegrityVerification {
  verification_id: string;
  evidence_id: string;
  recorded_hash: string;
  calculated_hash: string;
  status: IntegrityStatus;
  verified_by: string;
  timestamp: string;
  details?: string;
}

export interface CustodyEvent {
  id: number;
  event_id: string;
  case_id: string;
  evidence_id: string;
  event_type: string;
  actor: string;
  timestamp: string;
  description: string;
  previous_custodian?: string | null;
  new_custodian?: string | null;
  sha256_hash: string;
}

export interface IOC {
  id: number;
  ioc_id: string;
  analysis_id: string;
  case_id: string;
  ioc_type: 'IPv4' | 'Domain' | 'URL' | 'Email' | 'SHA-256' | string;
  value: string;
  context?: string | null;
  status: 'Extracted' | 'Unverified' | 'Needs Review' | string;
  created_at: string;
}

export interface AnalysisResult {
  id: number;
  analysis_id: string;
  evidence_id: string;
  case_id: string;
  file_type: string;
  file_size: number;
  sha256_hash: string;
  summary: string;
  metadata_json?: string | null;
  created_at: string;
  iocs: IOC[];
}

export interface InvestigationNote {
  id: number;
  note_id: string;
  case_id: string;
  evidence_id?: string | null;
  author: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ReportItem {
  id: number;
  report_id: string;
  case_id: string;
  title: string;
  report_type: string;
  generated_by: string;
  file_size: number;
  created_at: string;
  download_url?: string;
}

export interface TimelineEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  title: string;
  description: string;
  source: string;
  case_id: string;
  evidence_id?: string | null;
  actor?: string | null;
}

export interface DashboardStats {
  total_cases: number;
  open_cases: number;
  in_progress_cases: number;
  closed_cases: number;
  total_evidence: number;
  verified_evidence: number;
  unverified_evidence: number;
  mismatch_evidence: number;
  recent_cases: Case[];
  recent_evidence: Evidence[];
  recent_events: TimelineEvent[];
  cases_by_status: { status: string; count: number }[];
  cases_by_priority: { priority: string; count: number }[];
  evidence_by_type: { file_type: string; count: number }[];
}
