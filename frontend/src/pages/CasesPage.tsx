import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Calendar,
  User,
  ShieldAlert,
  StickyNote,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

import { api } from '../services/api';
import { Case } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const CasesPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'priority' | 'title'>('newest');

  const { openCreateCaseModal } = useOutletContext<{ openCreateCaseModal: () => void }>();

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCases({
        status: statusFilter,
        priority: priorityFilter,
        incident_type: typeFilter,
        search: search.trim() || undefined,
      });
      setCases(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCases();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, priorityFilter, typeFilter]);

  // Client-side sorting
  const sortedCases = [...cases].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'priority') {
      const pMap: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
    }
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Forensic Cases
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Active and archived digital forensics investigations & incident dossiers
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchCases}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateCaseModal}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create Case</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by case ID, title, investigator, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Secondary Filters & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Incident Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Incident Types</option>
              <option value="Malware investigation">Malware</option>
              <option value="Phishing investigation">Phishing</option>
              <option value="Unauthorized access">Unauthorized access</option>
              <option value="Data exfiltration">Data exfiltration</option>
              <option value="Ransomware">Ransomware</option>
              <option value="Insider threat">Insider threat</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="priority">Priority Severity</option>
              <option value="title">Alphabetical Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* Case List Content */}
      {loading ? (
        <LoadingSpinner message="Filtering forensic cases..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      ) : sortedCases.length === 0 ? (
        <EmptyState
          title="No Cases Matched Query"
          description="Try adjusting your search criteria, clearing filters, or create a new investigation record."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setStatusFilter('All');
            setPriorityFilter('All');
            setTypeFilter('All');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedCases.map((c) => (
            <Link
              key={c.case_id}
              to={`/cases/${c.case_id}`}
              className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900/95 hover:border-slate-700 transition-all duration-200 block group shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs font-semibold">
                      {c.case_id}
                    </span>
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-slate-400 px-2 py-0.5 rounded bg-slate-800/80">
                      {c.incident_type}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                    {c.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2 max-w-4xl">
                    {c.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {c.investigator}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Opened: {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-slate-400">
                      <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                      {c.evidence_count || 0} Evidence Artifacts
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-slate-400">
                      <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                      {c.notes_count || 0} Notes
                    </span>
                  </div>
                </div>

                <div className="flex items-center lg:self-center flex-shrink-0 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all">
                  <span className="text-xs font-semibold mr-1 hidden sm:inline">Open Workspace</span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
