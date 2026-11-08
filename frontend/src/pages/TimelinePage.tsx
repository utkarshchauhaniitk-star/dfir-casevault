import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  StickyNote,
  Briefcase,
  Binary,
  History,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

import { api } from '../services/api';
import { TimelineEvent } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const TimelinePage: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const fetchTimeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getGlobalTimeline({
        event_type: typeFilter !== 'All' ? typeFilter : undefined,
        search: search.trim() || undefined,
      });
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load timeline events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTimeline();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, typeFilter]);

  const getEventIcon = (eventType: string) => {
    const lower = eventType.toLowerCase();
    if (lower.includes('case')) return <Briefcase className="w-3.5 h-3.5 text-blue-400" />;
    if (lower.includes('integrity') || lower.includes('verified')) return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
    if (lower.includes('evidence')) return <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />;
    if (lower.includes('analysis') || lower.includes('ioc')) return <Binary className="w-3.5 h-3.5 text-cyan-400" />;
    if (lower.includes('note')) return <StickyNote className="w-3.5 h-3.5 text-amber-400" />;
    return <History className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Investigation Timeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Multi-source chronological incident reconstruction and forensic event tracking
          </p>
        </div>
        <button
          onClick={fetchTimeline}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search timeline events, descriptions, or referenced IDs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs sm:text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Event Categories</option>
              <option value="Case">Case Lifecycle</option>
              <option value="Evidence">Evidence Ingestion</option>
              <option value="Integrity">Integrity Verifications</option>
              <option value="Custody">Chain of Custody</option>
              <option value="Analysis">Forensic Analysis</option>
              <option value="Note">Investigator Notes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <LoadingSpinner message="Reconstructing forensic timeline..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          title="No Timeline Events Match Filters"
          description="Adjust your search query or clear event category filters."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch('');
            setTypeFilter('All');
          }}
        />
      ) : (
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative pl-8 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {events.map((ev) => (
              <div key={ev.event_id} className="relative group">
                <span className="absolute -left-[35px] top-1 p-1 rounded-full bg-slate-900 border border-slate-700 ring-4 ring-slate-950">
                  {getEventIcon(ev.event_type)}
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                      {ev.event_type}
                    </span>
                    <span className="text-sm font-bold text-slate-100">{ev.title}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {new Date(ev.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-3xl">{ev.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 mt-2 pt-1">
                  <span>Source: <span className="text-slate-400 font-medium">{ev.source}</span></span>
                  {ev.actor && <span>&bull; Actor: <span className="text-slate-400">{ev.actor}</span></span>}
                  {ev.case_id && (
                    <Link
                      to={`/cases/${ev.case_id}`}
                      className="text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                    >
                      Case: {ev.case_id}
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  )}
                  {ev.evidence_id && (
                    <span className="font-mono text-slate-400">&bull; Artifact: {ev.evidence_id}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
