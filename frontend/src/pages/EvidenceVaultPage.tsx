import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Filter,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Upload,
  RefreshCw,
  ExternalLink,
  History,
  AlertTriangle
} from 'lucide-react';

import { api } from '../services/api';
import { Evidence, Case } from '../types';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { UploadEvidenceModal } from '../components/evidence/UploadEvidenceModal';
import { Modal } from '../components/common/Modal';

export const EvidenceVaultPage: React.FC = () => {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals & Actions
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [custodyModalOpen, setCustodyModalOpen] = useState(false);
  const [selectedCustodyEvents, setSelectedCustodyEvents] = useState<any[]>([]);
  const [selectedCustodyLabel, setSelectedCustodyLabel] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [evList, caseList] = await Promise.all([
        api.getAllEvidence(),
        api.getCases()
      ]);
      setEvidence(evList);
      setCases(caseList);
    } catch (err: any) {
      setError(err.message || 'Failed to load evidence vault.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVerify = async (evidenceId: string) => {
    setVerifyingId(evidenceId);
    try {
      await api.verifyEvidence(evidenceId);
      await fetchData();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleOpenCustody = async (evidenceId: string, filename: string) => {
    try {
      const events = await api.getEvidenceCustody(evidenceId);
      setSelectedCustodyEvents(events);
      setSelectedCustodyLabel(`${evidenceId} &bull; ${filename}`);
      setCustodyModalOpen(true);
    } catch (err: any) {
      alert(`Failed to load chain of custody: ${err.message}`);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredEvidence = evidence.filter((ev) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      ev.original_filename.toLowerCase().includes(s) ||
      ev.evidence_id.toLowerCase().includes(s) ||
      ev.case_id.toLowerCase().includes(s) ||
      ev.sha256_hash.toLowerCase().includes(s) ||
      ev.collection_source.toLowerCase().includes(s);

    const matchesStatus = statusFilter === 'All' || ev.integrity_status === statusFilter;

    const ext = ev.original_filename.split('.').pop()?.toUpperCase() || 'RAW';
    const matchesType = typeFilter === 'All' || ext === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Evidence Vault & Hashes
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Immutable artifact custody, cryptographic SHA-256 verification, and integrity logging
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30"
          >
            <Upload className="w-4 h-4" />
            <span>Ingest Evidence</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by filename, artifact ID, case, or SHA-256..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Integrity Statuses</option>
              <option value="Verified">Verified Only</option>
              <option value="Integrity Mismatch">Integrity Mismatches</option>
              <option value="Unverified">Unverified</option>
              <option value="File Missing">File Missing</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Formats</option>
              <option value="LOG">LOG</option>
              <option value="JSON">JSON</option>
              <option value="CSV">CSV</option>
              <option value="TXT">TXT</option>
              <option value="PDF">PDF</option>
              <option value="ZIP">ZIP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Evidence Table */}
      {loading ? (
        <LoadingSpinner message="Scanning evidence repository..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      ) : filteredEvidence.length === 0 ? (
        <EmptyState
          title="No Evidence Artifacts Found"
          description="No evidence artifacts match your search filters or the vault is currently empty."
          actionLabel="Ingest First Artifact"
          onAction={() => setUploadModalOpen(true)}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Artifact ID</th>
                <th className="py-3.5 px-4">Filename & Source</th>
                <th className="py-3.5 px-4">Case ID</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4">Cryptographic SHA-256</th>
                <th className="py-3.5 px-4">Integrity Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredEvidence.map((ev) => (
                <tr key={ev.evidence_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-blue-400">
                    {ev.evidence_id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-100">{ev.original_filename}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{ev.collection_source}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Link
                      to={`/cases/${ev.case_id}`}
                      className="font-mono text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                    >
                      {ev.case_id}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {(ev.file_size / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-300 truncate max-w-[150px] select-all">
                        {ev.sha256_hash.slice(0, 16)}...
                      </span>
                      <button
                        onClick={() => copyToClipboard(ev.sha256_hash, ev.evidence_id)}
                        className="p-1 text-slate-500 hover:text-white"
                        title="Copy SHA-256"
                      >
                        {copiedHash === ev.evidence_id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <VerificationBadge status={ev.integrity_status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleVerify(ev.evidence_id)}
                        disabled={verifyingId === ev.evidence_id}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1"
                        title="Run SHA-256 verification"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{verifyingId === ev.evidence_id ? 'Checking...' : 'Verify'}</span>
                      </button>
                      <button
                        onClick={() => handleOpenCustody(ev.evidence_id, ev.original_filename)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="View chain of custody ledger"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={api.getEvidenceDownloadUrl(ev.evidence_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Download artifact"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Evidence Modal */}
      <UploadEvidenceModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        cases={cases}
        onUploadSuccess={fetchData}
        onUpload={api.uploadEvidence}
      />

      {/* Custody Modal */}
      <Modal
        isOpen={custodyModalOpen}
        onClose={() => setCustodyModalOpen(false)}
        title="Chain of Custody Ledger"
      >
        <div className="space-y-4">
          <div
            className="text-xs font-semibold text-blue-400"
            dangerouslySetInnerHTML={{ __html: selectedCustodyLabel }}
          />
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
