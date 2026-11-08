import React, { useEffect, useState } from 'react';
import { Menu, ShieldAlert, UserCheck, Activity, Plus } from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  onToggleMobile: () => void;
  onOpenCreateCase?: () => void;
}

export const Navbar: React.FC<Props> = ({ onToggleMobile, onOpenCreateCase }) => {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .checkHealth()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false));
  }, []);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleMobile}
          className="p-2 text-slate-400 hover:text-slate-200 lg:hidden rounded-lg hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 font-mono">
          <span className="text-slate-500">SESSION:</span>
          <span className="text-blue-400 font-medium">INCIDENT-ROOM-ONLINE</span>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Backend status indicator */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700/60 text-xs">
          <Activity
            className={`w-3.5 h-3.5 ${
              healthy === true
                ? 'text-emerald-400'
                : healthy === false
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          />
          <span className="text-slate-300 font-medium">
            {healthy === true ? 'Engine Online' : healthy === false ? 'API Offline' : 'Connecting...'}
          </span>
        </div>

        {/* Investigator tag */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 font-medium">
          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden sm:inline">Investigator:</span>
          <span className="font-semibold text-white">Lead Analyst (Demo)</span>
        </div>

        {/* Global Quick Action */}
        {onOpenCreateCase && (
          <button
            onClick={onOpenCreateCase}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm shadow-blue-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Case</span>
          </button>
        )}
      </div>
    </header>
  );
};
