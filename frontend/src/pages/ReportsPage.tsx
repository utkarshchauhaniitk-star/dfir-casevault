import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  ExternalLink,
  Plus,
  RefreshCw,
  Calendar,
  User,
  ShieldCheck,
  Search
} from 'lucide-react';

import { api } from '../services/api';
import { ReportItem, Case } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [reportType, setReportType] = useState('Full Investigation Report');
  const [customTitle, setCustomTitle] = useState('');
  const [generating, setGenerating] = useState(false);

  const fetchReportsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const caseList = await api.getCases();
      setCases(caseList);
      if (caseList.length > 0 && !selectedCaseId) {
        setSelectedCaseId(caseList[0].case_id);
      }
      // Gather reports for all cases
      const reportPromises = caseList.map((c) => api.getCaseReports(c.case_id));
      const nestedReports = await Promise.all(reportPromises);
      const flattened = nestedReports.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setReports(flattened);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch generated reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;
    setGenerating(true);
    try {
      await api.generateReport(selectedCaseId, {
        report_type: reportType,
        title: customTitle.trim() || undefined,
      });
      setCreateModalOpen(false);
      setCustomTitle('');
      await fetchReportsData();
    } catch (err: any) {
      alert(`Report generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    const s = search.toLowerCase();
    return (
      !s ||
      r.title.toLowerCase().includes(s) ||
      r.case_id.toLowerCase().includes(s) ||
      r.report_type.toLowerCase().includes(s) ||
      r.report_id.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Forensic PDF Reports & Dossiers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Cryptographically compiled PDF investigation dossiers generated via ReportLab
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchReportsData}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search reports by title, case ID, report type, or dossier ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <LoadingSpinner message="Loading forensic report archive..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      ) : filteredReports.length === 0 ? (
        <EmptyState
          title="No Reports Generated Yet"
          description="Compile your first official forensic PDF report containing incident summaries, evidence inventories, and chain of custody logs."
          actionLabel="Generate Report"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReports.map((r) => (
            <div
              key={r.report_id}
              className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                    {r.report_id}
                  </span>
                  <span className="text-xs text-slate-400 px-2 py-0.5 rounded bg-slate-800 font-medium">
                    {r.report_type}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{r.title}</h3>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <Link
                    to={`/cases/${r.case_id}`}
                    className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                  >
                    Target Case: {r.case_id}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <span>&bull;</span>
                  <span>Generated by: {r.generated_by}</span>
                  <span>&bull;</span>
                  <span>Size: {(r.file_size / 1024).toFixed(1)} KB</span>
                  <span>&bull;</span>
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center flex-shrink-0">
                <a
                  href={api.getReportDownloadUrl(r.report_id)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700/80"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Download PDF Dossier</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Report Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Generate Forensic Report (PDF)"
      >
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Target Investigation Case *
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              {cases.map((c) => (
                <option key={c.case_id} value={c.case_id}>
                  {c.case_id} &mdash; {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Report Template *
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Full Investigation Report">Full Investigation Report (Comprehensive)</option>
              <option value="Case Summary">Case Summary Dossier</option>
              <option value="Evidence Inventory">Evidence Inventory & Hashes</option>
              <option value="Chain of Custody Report">Chain of Custody Transfer Ledger</option>
              <option value="Investigation Timeline">Chronological Incident Timeline</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Custom Report Title (Optional)
            </label>
            <input
              type="text"
              placeholder={`e.g. ${reportType} - ${selectedCaseId}`}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating || !selectedCaseId}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50"
            >
              {generating ? 'Compiling PDF...' : 'Compile Report'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
