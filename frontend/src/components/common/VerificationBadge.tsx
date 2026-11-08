import React from 'react';
import { ShieldCheck, AlertTriangle, FileQuestion, HelpCircle, AlertOctagon } from 'lucide-react';
import { IntegrityStatus } from '../../types';

interface Props {
  status: IntegrityStatus | string;
  className?: string;
  showIcon?: boolean;
}

export const VerificationBadge: React.FC<Props> = ({ status, className = '', showIcon = true }) => {
  const renderContent = () => {
    switch (status) {
      case 'Verified':
        return {
          icon: <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />,
          styles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          label: 'SHA-256 Verified',
        };
      case 'Integrity Mismatch':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-400 animate-pulse" />,
          styles: 'bg-rose-500/15 text-rose-400 border-rose-500/40 font-bold',
          label: 'Integrity Mismatch',
        };
      case 'File Missing':
        return {
          icon: <FileQuestion className="w-3.5 h-3.5 mr-1 text-orange-400" />,
          styles: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          label: 'File Missing',
        };
      case 'Verification Error':
        return {
          icon: <AlertOctagon className="w-3.5 h-3.5 mr-1 text-amber-400" />,
          styles: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          label: 'Verification Error',
        };
      default:
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 mr-1 text-slate-400" />,
          styles: 'bg-slate-800 text-slate-400 border-slate-700',
          label: 'Unverified',
        };
    }
  };

  const { icon, styles, label } = renderContent();

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      {showIcon && icon}
      {label}
    </span>
  );
};
