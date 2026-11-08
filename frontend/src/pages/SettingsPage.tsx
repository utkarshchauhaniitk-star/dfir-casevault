import React, { useEffect, useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Database,
  Lock,
  FileCode,
  HardDrive,
  Info,
  Server,
  Activity,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .checkHealth()
      .then((data) => setHealthInfo(data))
      .catch((err) => setHealthInfo({ status: 'error', detail: err.message }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          System Configuration & Forensic Architecture
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Cryptographic parameters, security guardrails, storage topology, and portfolio disclosures
        </p>
      </div>

      {/* Engine Status Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Forensic Backend Service</h3>
              <p className="text-xs text-slate-400">FastAPI • Python 3.12 • SQLAlchemy ORM</p>
            </div>
          </div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Operational</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 font-mono">SERVICE:</span>
            <div className="text-slate-200 font-semibold mt-0.5">{healthInfo?.service || 'DFIR CaseVault'}</div>
          </div>
          <div>
            <span className="text-slate-500 font-mono">VERSION:</span>
            <div className="text-slate-200 font-semibold mt-0.5">{healthInfo?.version || '1.0.0'}</div>
          </div>
          <div>
            <span className="text-slate-500 font-mono">DATABASE STATE:</span>
            <div className="text-emerald-400 font-semibold mt-0.5">{healthInfo?.database || 'Connected'}</div>
          </div>
        </div>
      </div>

      {/* Security & Forensic Guardrails */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-400" />
          Security Architecture & Forensic Guardrails
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Cryptographic Integrity Engine
            </h4>
            <p className="text-slate-400">
              Utilizes Python's native <code className="text-blue-400">hashlib.sha256</code> to calculate
              deterministic 256-bit hashes on raw ingested bytes. Hash verifications perform live streaming
              disk-to-digest comparisons. Discrepancies trigger an <span className="text-rose-400 font-semibold">Integrity Mismatch</span> status without altering the original recorded baseline.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-amber-400" />
              Upload Safety & Path Isolation
            </h4>
            <p className="text-slate-400">
              Evidence artifacts are assigned collision-resistant UUID prefixes and stored outside web server
              public document roots. Filenames are strictly sanitized to prevent directory traversal attacks (<code className="text-amber-400">../</code>). Upload payloads are restricted to a 25 MB ceiling.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-cyan-400" />
              Zero Execution Policy
            </h4>
            <p className="text-slate-400">
              Uploaded files are never executed, launched as subprocesses, or parsed through untrusted shell
              interpreters. Archive files (ZIP) are inspected exclusively via table-of-contents cataloging
              without disk decompression.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-purple-400" />
              Append-Only Chain of Custody
            </h4>
            <p className="text-slate-400">
              Custody transfers, downloads, verifications, and analytical procedures automatically append
              immutable ledger entries with UTC timestamps, actor attribution, and corresponding byte hashes.
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Disclaimers */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          Demonstration & Educational Disclaimer
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          DFIR CaseVault is built as a portfolio-grade cybersecurity demonstration application showcasing
          digital forensics, evidence integrity verification, and incident management workflows. It is developed
          using entirely synthetic sample evidence and simulated investigations.
        </p>
        <p className="text-xs text-slate-500 font-mono">
          Advisory: This platform is not certified for formal court or judicial proceedings without independent
          evidentiary and cryptographic compliance verification.
        </p>
      </div>

      {/* Database Reset & Seeding Info */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
          Database Management & Demo Seeding CLI
        </h3>
        <p className="text-xs text-slate-400">
          To reset the demo database and re-seed the fictional incident scenarios and sample evidence files, run:
        </p>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-blue-400 select-all">
          PYTHONPATH=backend python backend/seed.py --reset
        </div>
      </div>
    </div>
  );
};
