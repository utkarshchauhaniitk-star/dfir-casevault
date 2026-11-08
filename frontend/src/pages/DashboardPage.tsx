import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Briefcase,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Plus,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

import { api } from '../services/api';
import { DashboardStats } from '../types';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const { openCreateCaseModal } = useOutletContext<{ openCreateCaseModal: () => void }>();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerifyEvidence = async (evidenceId: string) => {
    setVerifyingId(evidenceId);
    try {
      await api.verifyEvidence(evidenceId);
      await loadData();
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Gathering case vault metrics..." />;
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
        <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Connection Error
        </h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!stats || stats.total_cases === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Forensic Dashboard</h1>
          <p className="text-sm text-slate-400">Digital Evidence & Incident Investigation Ledger</p>
        </div>
        <EmptyState
          title="No Active Investigations Found"
          description="Your forensic vault database is currently clean. Open your first case to initiate cryptographic evidence tracking."
          actionLabel="Open First Case"
          onAction={openCreateCaseModal}
        />
      </div>
    );
  }

  const activeCasesCount = stats.open_cases + stats.in_progress_cases;
  const STATUS_COLORS: Record<string, string> = {
    Open: '#3b82f6',
    'In Progress': '#f59e0b',
    'Under Review': '#a855f7',
    Closed: '#10b981',
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Forensic Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time evidence tracking, SHA-256 verification ledgers, and forensic timelines.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            title="Refresh dashboard"
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateCaseModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>New Investigation</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cases"
          value={stats.total_cases}
          subtitle={`${stats.closed_cases} resolved • ${activeCasesCount} active`}
          icon={Briefcase}
          colorScheme="blue"
          linkTo="/cases"
        />
        <StatCard
          title="Active In-Progress"
          value={activeCasesCount}
          subtitle={`${stats.open_cases} open • ${stats.in_progress_cases} in triage`}
          icon={FolderOpen}
          colorScheme="amber"
          linkTo="/cases"
        />
        <StatCard
          title="Evidence Artifacts"
          value={stats.total_evidence}
          subtitle={`${stats.verified_evidence} verified hashes`}
          icon={ShieldAlert}
          colorScheme="purple"
          linkTo="/evidence"
        />
        <StatCard
          title="Cryptographic Integrity"
          value={`${stats.verified_evidence} / ${stats.total_evidence}`}
          subtitle={
            stats.mismatch_evidence > 0
              ? `⚠️ ${stats.mismatch_evidence} mismatch detected!`
              : 'All verified hashes intact'
          }
          icon={ShieldCheck}
          colorScheme={stats.mismatch_evidence > 0 ? 'rose' : 'emerald'}
          linkTo="/evidence"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Status Chart */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase mb-4">
            Investigations by Status
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.cases_by_status} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="status" type="category" stroke="#94a3b8" fontSize={12} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                  itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {stats.cases_by_status.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Evidence Artifacts by Type Chart */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase mb-4">
            Evidence Artifacts by File Format
          </h3>
          <div className="h-64 flex items-center justify-center">
            {stats.evidence_by_type.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.evidence_by_type}>
                  <XAxis dataKey="file_type" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    itemStyle={{ color: '#f8fafc', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No evidence artifacts uploaded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Lists: Recent Cases & Recent Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
                Recent Case Files
              </h3>
              <Link to="/cases" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-800/80">
              {stats.recent_cases.map((c) => (
                <div key={c.case_id} className="py-3 flex items-center justify-between gap-3 group">
                  <div className="min-w-0">
                    <Link
                      to={`/cases/${c.case_id}`}
                      className="text-sm font-medium text-slate-100 hover:text-blue-400 truncate block transition-colors"
                    >
                      {c.title}
                    </Link>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-slate-400">
                      <span className="font-mono text-blue-400/90">{c.case_id}</span>
                      <span>&bull;</span>
                      <span>{c.incident_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Evidence & Integrity State */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
                Recent Evidence Activity
              </h3>
              <Link to="/evidence" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Evidence Vault <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-800/80">
              {stats.recent_evidence.map((ev) => (
                <div key={ev.evidence_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100 truncate">
                      {ev.original_filename}
                    </div>
                    <div className="flex items-center space-x-2 mt-1 text-xs text-slate-400">
                      <span className="font-mono text-slate-500">{ev.evidence_id}</span>
                      <span>&bull;</span>
                      <span className="font-mono truncate max-w-[120px] text-slate-400">
                        {ev.sha256_hash.slice(0, 12)}...
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <VerificationBadge status={ev.integrity_status} />
                    <button
                      onClick={() => handleVerifyEvidence(ev.evidence_id)}
                      disabled={verifyingId === ev.evidence_id}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
                    >
                      {verifyingId === ev.evidence_id ? 'Checking...' : 'Verify'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Timeline Preview */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            Recent Investigation Events
          </h3>
          <Link to="/timeline" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
            Full Timeline <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {stats.recent_events.slice(0, 5).map((ev) => (
            <div key={ev.event_id} className="relative group">
              <span className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-950 ring-4 ring-slate-900" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-semibold text-slate-200">{ev.title}</span>
                <span className="text-[11px] font-mono text-slate-500">
                  {new Date(ev.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{ev.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
