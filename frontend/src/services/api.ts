import {
  Case,
  CaseCreatePayload,
  CaseUpdatePayload,
  Evidence,
  IntegrityVerification,
  CustodyEvent,
  AnalysisResult,
  IOC,
  InvestigationNote,
  ReportItem,
  TimelineEvent,
  DashboardStats
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected server error occurred.';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      errorDetail = `${response.status} ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  // Handle empty or file responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {} as T;
}

export const api = {
  // Health
  checkHealth: () => request<{ status: string; service: string }>('/api/health'),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/api/dashboard/stats'),

  // Cases
  getCases: (params?: { status?: string; priority?: string; incident_type?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'All') query.append('status', params.status);
    if (params?.priority && params.priority !== 'All') query.append('priority', params.priority);
    if (params?.incident_type && params.incident_type !== 'All') query.append('incident_type', params.incident_type);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return request<Case[]>(`/api/cases${qs ? `?${qs}` : ''}`);
  },

  getCase: (caseId: string) => request<Case>(`/api/cases/${caseId}`),
  createCase: (payload: CaseCreatePayload) =>
    request<Case>('/api/cases', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCase: (caseId: string, payload: CaseUpdatePayload) =>
    request<Case>(`/api/cases/${caseId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCase: (caseId: string) =>
    request<{ message: string }>(`/api/cases/${caseId}`, {
      method: 'DELETE',
    }),

  // Evidence
  getAllEvidence: () => request<Evidence[]>('/api/evidence'),
  getCaseEvidence: (caseId: string) => request<Evidence[]>(`/api/cases/${caseId}/evidence`),
  getEvidence: (evidenceId: string) => request<Evidence>(`/api/evidence/${evidenceId}`),
  uploadEvidence: (caseId: string, formData: FormData) =>
    request<Evidence>(`/api/cases/${caseId}/evidence`, {
      method: 'POST',
      body: formData,
    }),
  verifyEvidence: (evidenceId: string) =>
    request<IntegrityVerification>(`/api/evidence/${evidenceId}/verify`, {
      method: 'POST',
    }),
  getEvidenceDownloadUrl: (evidenceId: string) => `${API_BASE}/api/evidence/${evidenceId}/download`,

  // Custody
  getEvidenceCustody: (evidenceId: string) =>
    request<CustodyEvent[]>(`/api/evidence/${evidenceId}/custody`),
  getCaseCustody: (caseId: string) =>
    request<CustodyEvent[]>(`/api/cases/${caseId}/custody`),

  // Analysis & IOCs
  analyzeEvidence: (evidenceId: string) =>
    request<AnalysisResult>(`/api/evidence/${evidenceId}/analyze`, {
      method: 'POST',
    }),
  getEvidenceAnalysis: (evidenceId: string) =>
    request<AnalysisResult>(`/api/evidence/${evidenceId}/analysis`),
  getCaseIocs: (caseId: string) => request<IOC[]>(`/api/cases/${caseId}/iocs`),
  getAllIocs: (iocType?: string) => {
    const qs = iocType && iocType !== 'All' ? `?ioc_type=${encodeURIComponent(iocType)}` : '';
    return request<IOC[]>(`/api/iocs${qs}`);
  },

  // Timeline
  getCaseTimeline: (caseId: string, params?: { event_type?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.event_type && params.event_type !== 'All') query.append('event_type', params.event_type);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return request<TimelineEvent[]>(`/api/cases/${caseId}/timeline${qs ? `?${qs}` : ''}`);
  },
  getGlobalTimeline: (params?: { event_type?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.event_type && params.event_type !== 'All') query.append('event_type', params.event_type);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return request<TimelineEvent[]>(`/api/timeline${qs ? `?${qs}` : ''}`);
  },

  // Notes
  getCaseNotes: (caseId: string) => request<InvestigationNote[]>(`/api/cases/${caseId}/notes`),
  createCaseNote: (caseId: string, payload: { title: string; content: string; author: string; evidence_id?: string | null }) =>
    request<InvestigationNote>(`/api/cases/${caseId}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Reports
  getCaseReports: (caseId: string) => request<ReportItem[]>(`/api/cases/${caseId}/reports`),
  generateReport: (caseId: string, payload: { report_type: string; title?: string }) =>
    request<ReportItem>(`/api/cases/${caseId}/reports`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getReportDownloadUrl: (reportId: string) => `${API_BASE}/api/reports/${reportId}/download`,
};
