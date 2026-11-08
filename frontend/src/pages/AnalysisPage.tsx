import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Binary,
  Search,
  Filter,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Globe,
  Mail,
  Hash,
  Server
} from 'lucide-react';

import { api } from '../services/api';
import { IOC } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';

export const AnalysisPage: React.FC = () => {
  const [iocs, setIocs] = useState<IOC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchIocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllIocs(typeFilter !== 'All' ? typeFilter : undefined);
      setIocs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load indicators of compromise.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIocs();
  }, [typeFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredIocs = iocs.filter((ioc) => {
    const s = search.toLowerCase();
    return (
      !s ||
      ioc.value.toLowerCase().includes(s) ||
      ioc.ioc_type.toLowerCase().includes(s) ||
      ioc.case_id.toLowerCase().includes(s) ||
      (ioc.context && ioc.context.toLowerCase().includes(s))
    );
  });

  const getIocTypeIcon = (type: string) => {
    switch (type) {
      case 'IPv4':
        return <Server className="w-3.5 h-3.5 text-blue-400" />;
      case 'Domain':
      case 'URL':
        return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Email':
        return <Mail className="w-3.5 h-3.5 text-amber-400" />;
      case 'SHA-256':
        return <Hash className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Binary className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Artifact Analysis & IOC Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Validated Indicators of Compromise extracted without execution from evidence artifacts
          </p>
        </div>
        <button
          onClick={fetchIocs}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search indicators by IP, domain, URL, email, hash, or case..."
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
              <option value="All">All Indicator Types</option>
              <option value="IPv4">IPv4 Addresses</option>
              <option value="Domain">Domains</option>
              <option value="URL">URLs</option>
              <option value="Email">Email Addresses</option>
              <option value="SHA-256">SHA-256 Hashes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSpinner message="Querying extracted IOC catalog..." />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      ) : filteredIocs.length === 0 ? (
        <EmptyState
          title="No Indicators Found"
          description="Extract indicators by uploading forensic logs, CSVs, or configs and running automated artifact analysis in case workspaces."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Extracted Value</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Origin Case</th>
                <th className="py-3.5 px-4">Detection Context</th>
                <th className="py-3.5 px-4 text-right">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredIocs.map((ioc) => (
                <tr key={ioc.ioc_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-semibold">
                      {getIocTypeIcon(ioc.ioc_type)}
                      <span>{ioc.ioc_type}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-100 select-all max-w-sm truncate">
                    {ioc.value}
                  </td>
                  <td className="py-3.5 px-4">
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
                  <td className="py-3.5 px-4">
                    <Link
                      to={`/cases/${ioc.case_id}`}
                      className="font-mono text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                    >
                      {ioc.case_id}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                    {ioc.context || 'Identified via safe forensic pattern parser'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => copyToClipboard(ioc.value, ioc.ioc_id)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Copy indicator"
                    >
                      {copiedId === ioc.ioc_id ? (
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
  );
};
