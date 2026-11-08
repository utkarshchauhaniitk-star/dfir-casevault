import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ShieldAlert,
  Clock,
  Binary,
  StickyNote,
  FileText,
  ShieldCheck,
  Upload,
  RefreshCw,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Play,
  Plus,
  ArrowLeft,
  Calendar,
  User,
  ExternalLink,
  Edit3
} from 'lucide-react';

import { api } from '../services/api';
import {
  Case,
  Evidence,
  TimelineEvent,
  AnalysisResult,
  IOC,
  InvestigationNote,
  ReportItem,
  CaseStatus,
  CasePriority
} from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { UploadEvidenceModal } from '../components/evidence/UploadEvidenceModal';
import { Modal } from '../components/common/Modal';

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'evidence' | 'timeline' | 'analysis' | 'notes' | 'reports'>('overview');
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [notesList, setNotesList] = useState<InvestigationNote[]>([]);
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [iocsList, setIocsList] = useState<IOC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editStatusModalOpen, setEditStatusModalOpen] = useState(false);
  const [newNoteModalOpen, setNewNoteModalOpen] = useState(false);
  const [generateReportModalOpen, setGenerateReportModalOpen] = useState(false);
  const [custodyModalOpen, setCustodyModalOpen] = useState(false);
  const [selectedCustodyEvents, setSelectedCustodyEvents] = useState<any[]>([]);
  const [selectedCustodyEvidence, setSelectedCustodyEvidence] = useState<string>('');

  // Form states
  const [newStatus, setNewStatus] = useState<CaseStatus>('Open');
  const [newPriority, setNewPriority] = useState<CasePriority>('Medium');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('Lead Forensic Investigator (Demo)');
  const [noteLinkedEvidence, setNoteLinkedEvidence] = useState<string>('');
  const [reportType, setReportType] = useState('Full Investigation Report');
  const [reportCustomTitle, setReportCustomTitle] = useState('');

  // Async action flags
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchCaseWorkspace = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const [c, evs, tl, nts, reps, iocs] = await Promise.all([
        api.getCase(caseId),
        api.getCaseEvidence(caseId),
        api.getCaseTimeline(caseId),
        api.getCaseNotes(caseId),
        api.getCaseReports(caseId),
        api.getCaseIocs(caseId)
      ]);
      setCaseData(c);
      setNewStatus(c.status);
      setNewPriority(c.priority);
      setEvidenceList(evs);
      setTimelineEvents(tl);
      setNotesList(nts);
      setReportsList(reps);
      setIocsList(iocs);
    } catch (err: any) {
      setError(err.message || 'Failed to load case investigation workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseWorkspace();
  }, [caseId]);

  const handleUpdateStatusPriority = async () => {
    if (!caseId) return;
    try {
      await api.updateCase(caseId, {
        status: newStatus,
        priority: newPriority
      });
      setEditStatusModalOpen(false);
      await fetchCaseWorkspace();
    } catch (err: any) {
      alert(`Error updating case: ${err.message}`);
    }
  };

  const handleVerifyEvidence = async (evidenceId: string) => {
    setActionInProgress(`verify-${evidenceId}`);
    try {
      const res = await api.verifyEvidence(evidenceId);
      await fetchCaseWorkspace();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAnalyzeEvidence = async (evidenceId: string) => {
    setActionInProgress(`analyze-${evidenceId}`);
    try {
      await api.analyzeEvidence(evidenceId);
      await fetchCaseWorkspace();
      setActiveTab('analysis');
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleViewCustody = async (evidenceId: string, filename: string) => {
    try {
      const events = await api.getEvidenceCustody(evidenceId);
      setSelectedCustodyEvents(events);
      setSelectedCustodyEvidence(`${evidenceId} (${filename})`);
      setCustodyModalOpen(true);
    } catch (err: any) {
      alert(`Failed to load custody ledger: ${err.message}`);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !noteTitle.trim() || !noteContent.trim()) return;
    try {
      await api.createCaseNote(caseId, {
        title: noteTitle,
        content: noteContent,
        author: noteAuthor,
        evidence_id: noteLinkedEvidence || null
      });
      setNoteTitle('');
      setNoteContent('');
      setNewNoteModalOpen(false);
      await fetchCaseWorkspace();
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    setActionInProgress('generating-report');
    try {
      await api.generateReport(caseId, {
        report_type: reportType,
        title: reportCustomTitle.trim() || undefined
      });
      setGenerateReportModalOpen(false);
      setReportCustomTitle('');
      await fetchCaseWorkspace();
      setActiveTab('reports');
    } catch (err: any) {
      alert(`Failed to generate report: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (loading) {
    return <LoadingSpinner message="Mounting forensic investigation workspace..." />;
  }

  if (error || !caseData) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
        <h3 className="font-semibold text-base mb-1">Investigation Unavailable</h3>
        <p className="text-sm">{error || 'Case not found in database.'}</p>
        <button
          onClick={() => navigate('/cases')}
          className="mt-4 px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg"
        >
          Return to Cases
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/cases"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-semibold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                {caseData.case_id}
              </span>
              <PriorityBadge priority={caseData.priority} />
              <StatusBadge status={caseData.status} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              {caseData.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setEditStatusModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Update Status</span>
          </button>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm shadow-blue-600/30"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Ingest Evidence</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 flex overflow-x-auto gap-2">
        {[
          { key: 'overview', label: 'Overview', icon: Briefcase, count: undefined },
          { key: 'evidence', label: 'Evidence Vault', icon: ShieldAlert, count: evidenceList.length },
          { key: 'timeline', label: 'Timeline', icon: Clock, count: timelineEvents.length },
          { key: 'analysis', label: 'Artifact Analysis', icon: Binary, count: iocsList.length },
          { key: 'notes', label: 'Investigator Notes', icon: StickyNote, count: notesList.length },
          { key: 'reports', label: 'Reports', icon: FileText, count: reportsList.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Incident Type</span>
              <div className="text-sm font-semibold text-slate-100 mt-1">{caseData.incident_type}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Lead Investigator</span>
              <div className="text-sm font-semibold text-slate-100 mt-1">{caseData.investigator}</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Incident Timestamp</span>
              <div className="text-sm font-semibold text-slate-100 mt-1">
                {caseData.incident_date ? new Date(caseData.incident_date).toLocaleString() : 'Not specified'}
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Total Evidence</span>
              <div className="text-sm font-semibold text-blue-400 mt-1">{evidenceList.length} artifacts</div>
            </div>
          </div>

          {/* Narrative */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
              Incident Narrative & Investigation Scope
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {caseData.description}
            </p>
          </div>

          {/* Quick Summary Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-200 uppercase">Latest Evidence</h4>
                <button
                  onClick={() => setActiveTab('evidence')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  View all &rarr;
                </button>
              </div>
              {evidenceList.length === 0 ? (
                <p className="text-xs text-slate-500">No evidence attached to this case yet.</p>
              ) : (
                <div className="space-y-3">
                  {evidenceList.slice(0, 3).map((ev) => (
                    <div key={ev.evidence_id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{ev.original_filename}</div>
                        <div className="text-[11px] font-mono text-slate-500">{ev.sha256_hash.slice(0, 16)}...</div>
                      </div>
                      <VerificationBadge status={ev.integrity_status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-200 uppercase">Investigator Notes</h4>
                <button
                  onClick={() => setActiveTab('notes')}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  View all &rarr;
                </button>
              </div>
              {notesList.length === 0 ? (
                <p className="text-xs text-slate-500">No investigator notes logged.</p>
              ) : (
                <div className="space-y-3">
                  {notesList.slice(0, 2).map((n) => (
                    <div key={n.note_id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="text-xs font-semibold text-slate-200">{n.title}</div>
                      <div className="text-xs text-slate-400 mt-1 line-clamp-2">{n.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EVIDENCE VAULT */}
      {activeTab === 'evidence' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Associated Forensic Evidence</h3>
              <p className="text-xs text-slate-400">Cryptographically tracked artifacts with append-only chain of custody</p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Ingest Artifact</span>
            </button>
          </div>

          {evidenceList.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
              <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-200">No Evidence Ingested</h4>
              <p className="text-xs text-slate-400 mt-1">Acquire and upload forensic artifacts into this case.</p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
              >
                Ingest Artifact Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {evidenceList.map((ev) => (
                <div
                  key={ev.evidence_id}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs text-blue-400 font-semibold px-2 py-0.5 rounded bg-blue-500/10">
                          {ev.evidence_id}
                        </span>
                        <h4 className="text-base font-bold text-white">{ev.original_filename}</h4>
                        <span className="text-xs text-slate-500">({(ev.file_size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Source: <span className="text-slate-300 font-medium">{ev.collection_source}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                      <VerificationBadge status={ev.integrity_status} />
                      <button
                        onClick={() => handleVerifyEvidence(ev.evidence_id)}
                        disabled={actionInProgress === `verify-${ev.evidence_id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{actionInProgress === `verify-${ev.evidence_id}` ? 'Verifying...' : 'Verify Hash'}</span>
                      </button>
                      <button
                        onClick={() => handleAnalyzeEvidence(ev.evidence_id)}
                        disabled={actionInProgress === `analyze-${ev.evidence_id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center space-x-1"
                      >
                        <Play className="w-3.5 h-3.5 text-blue-400" />
                        <span>{actionInProgress === `analyze-${ev.evidence_id}` ? 'Analyzing...' : 'Analyze Artifact'}</span>
                      </button>
                      <button
                        onClick={() => handleViewCustody(ev.evidence_id, ev.original_filename)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                      >
                        Custody Log
                      </button>
                      <a
                        href={api.getEvidenceDownloadUrl(ev.evidence_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Download artifact"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* SHA-256 Hash Box */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center space-x-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        SHA-256:
                      </span>
                      <span className="font-mono text-xs text-blue-300 truncate select-all">
                        {ev.sha256_hash}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(ev.sha256_hash, ev.evidence_id)}
                      className="p-1 text-slate-400 hover:text-white rounded"
                      title="Copy full hash"
                    >
                      {copiedHash === ev.evidence_id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {ev.description && (
                    <p className="text-xs text-slate-400 italic">{ev.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVESTIGATION TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Chronological Incident Reconstruction
            </h3>
            <span className="text-xs text-slate-500 font-mono">{timelineEvents.length} events registered</span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {timelineEvents.map((ev) => (
              <div key={ev.event_id} className="relative group">
                <span className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-950 ring-4 ring-slate-900" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {ev.event_type}
                    </span>
                    <span className="text-sm font-semibold text-slate-100">{ev.title}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{ev.description}</p>
                <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1.5">
                  <span>Source: {ev.source}</span>
                  {ev.actor && <span>&bull; Actor: {ev.actor}</span>}
                  {ev.evidence_id && <span>&bull; Ref: {ev.evidence_id}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FORENSIC ARTIFACT ANALYSIS & IOCS */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Extracted Indicators of Compromise (IOCs)</h3>
              <p className="text-xs text-slate-400">Validated candidates extracted safely from evidence without execution</p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-blue-400 font-semibold">
              {iocsList.length} Indicators Found
            </span>
          </div>

          {iocsList.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
              <Binary className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-200">No Indicators Extracted</h4>
              <p className="text-xs text-slate-400 mt-1">
                Go to the Evidence tab and click "Analyze Artifact" on an uploaded file to extract IOCs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Indicator Value</th>
                    <th className="py-3 px-4">Triage Status</th>
                    <th className="py-3 px-4">Context / Source</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {iocsList.map((ioc) => (
                    <tr key={ioc.ioc_id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <span className="font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                          {ioc.ioc_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-100 select-all">
                        {ioc.value}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            ioc.status === 'Needs Review'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {ioc.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {ioc.context || 'Identified via artifact parser'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => copyToClipboard(ioc.value, ioc.ioc_id)}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Copy indicator"
                        >
                          {copiedHash === ioc.ioc_id ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: INVESTIGATION NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Investigator Notes & Hypotheses</h3>
              <p className="text-xs text-slate-400">Timestamped observations and triage documentation</p>
            </div>
            <button
              onClick={() => setNewNoteModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Note</span>
            </button>
          </div>

          {notesList.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
              <StickyNote className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-200">No Notes Recorded</h4>
              <p className="text-xs text-slate-400 mt-1">Document investigator observations and working hypotheses.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notesList.map((n) => (
                <div
                  key={n.note_id}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-slate-100">{n.title}</h4>
                    <span className="text-xs font-mono text-slate-500">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{n.content}</p>
                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80">
                    <span>Author: {n.author}</span>
                    {n.evidence_id && (
                      <span className="font-mono text-blue-400">Linked Ref: {n.evidence_id}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PDF REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Forensic Investigation PDF Reports</h3>
              <p className="text-xs text-slate-400">
                Official dossier generation via ReportLab engine with cryptographic verification tables
              </p>
            </div>
            <button
              onClick={() => setGenerateReportModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate PDF Report</span>
            </button>
          </div>

          {reportsList.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl">
              <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-200">No Reports Generated</h4>
              <p className="text-xs text-slate-400 mt-1">Generate a comprehensive PDF dossier containing evidence and chain of custody.</p>
              <button
                onClick={() => setGenerateReportModalOpen(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg"
              >
                Generate First Report
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {reportsList.map((r) => (
                <div
                  key={r.report_id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold">
                        {r.report_id}
                      </span>
                      <h4 className="text-sm font-bold text-white">{r.title}</h4>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center space-x-3">
                      <span>Type: {r.report_type}</span>
                      <span>&bull;</span>
                      <span>Size: {(r.file_size / 1024).toFixed(1)} KB</span>
                      <span>&bull;</span>
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <a
                    href={api.getReportDownloadUrl(r.report_id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Download PDF</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Evidence Modal */}
      <UploadEvidenceModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        defaultCaseId={caseData.case_id}
        onUploadSuccess={fetchCaseWorkspace}
        onUpload={api.uploadEvidence}
      />

      {/* Update Status & Priority Modal */}
      <Modal
        isOpen={editStatusModalOpen}
        onClose={() => setEditStatusModalOpen(false)}
        title="Update Case Status & Priority"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Case Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as CaseStatus)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Priority
            </label>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as CasePriority)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setEditStatusModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateStatusPriority}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Note Modal */}
      <Modal isOpen={newNoteModalOpen} onClose={() => setNewNoteModalOpen(false)} title="Record Investigation Note">
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Note Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Memory Dump Carver Findings"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Content *</label>
            <textarea
              required
              rows={4}
              placeholder="Detailed findings, hypotheses, and evidence correlation..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Link to Evidence (Optional)</label>
            <select
              value={noteLinkedEvidence}
              onChange={(e) => setNoteLinkedEvidence(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">No linked evidence</option>
              {evidenceList.map((ev) => (
                <option key={ev.evidence_id} value={ev.evidence_id}>
                  {ev.evidence_id} &mdash; {ev.original_filename}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setNewNoteModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
            >
              Save Note
            </button>
          </div>
        </form>
      </Modal>

      {/* Generate Report Modal */}
      <Modal
        isOpen={generateReportModalOpen}
        onClose={() => setGenerateReportModalOpen(false)}
        title="Generate Forensic Dossier (PDF)"
      >
        <form onSubmit={handleGenerateReport} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Report Type *</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Full Investigation Report">Full Investigation Report (Comprehensive)</option>
              <option value="Case Summary">Case Summary Dossier</option>
              <option value="Evidence Inventory">Evidence Inventory & Hashes</option>
              <option value="Chain of Custody Report">Chain of Custody Transfer Ledger</option>
              <option value="Investigation Timeline">Chronological Incident Timeline</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Custom Title (Optional)</label>
            <input
              type="text"
              placeholder={`e.g. ${reportType} - ${caseData.case_id}`}
              value={reportCustomTitle}
              onChange={(e) => setReportCustomTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <p className="text-[11px] text-slate-400 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
            Report will compile actual stored evidence, SHA-256 hashes, chain of custody logs, and timeline events into a downloadable PDF via ReportLab.
          </p>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setGenerateReportModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionInProgress === 'generating-report'}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50"
            >
              {actionInProgress === 'generating-report' ? 'Compiling PDF...' : 'Generate PDF'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Custody Ledger Modal */}
      <Modal
        isOpen={custodyModalOpen}
        onClose={() => setCustodyModalOpen(false)}
        title={`Chain of Custody Ledger: ${selectedCustodyEvidence}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Append-only record of all handling, verification, and analytical actions for this evidence artifact.
          </p>
          <div className="divide-y divide-slate-800 text-xs">
            {selectedCustodyEvents.map((c: any) => (
              <div key={c.event_id} className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">{c.event_type}</span>
                  <span className="font-mono text-slate-500">{new Date(c.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-slate-300">{c.description}</p>
                <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                  <span>Custodian: {c.actor}</span>
                  <span>&bull;</span>
                  <span className="font-mono">Hash: {c.sha256_hash.slice(0, 16)}...</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              onClick={() => setCustodyModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
            >
              Close Ledger
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
