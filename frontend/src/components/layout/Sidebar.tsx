import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  ShieldAlert,
  Clock,
  Binary,
  FileText,
  Settings,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface Props {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Cases', path: '/cases', icon: Briefcase },
  { name: 'Evidence Vault', path: '/evidence', icon: ShieldAlert },
  { name: 'Timeline', path: '/timeline', icon: Clock },
  { name: 'Analysis & IOCs', path: '/analysis', icon: Binary },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC<Props> = ({ mobileOpen, setMobileOpen }) => {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900/95 border-r border-slate-800/80 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
                CaseVault
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                  DFIR
                </span>
              </span>
              <p className="text-[11px] text-slate-400 font-medium tracking-tight">Evidence • Integrity</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Investigations
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>{item.name}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-slate-500" />
            </NavLink>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 m-3 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cryptographic Mode</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 font-mono">
            SHA-256 Ledger Active
          </p>
        </div>
      </aside>
    </>
  );
};
