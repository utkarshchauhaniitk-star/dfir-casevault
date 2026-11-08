import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  linkTo?: string;
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
}

export const StatCard: React.FC<Props> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  linkTo,
  colorScheme = 'blue',
}) => {
  const colorMap = {
    blue: 'border-blue-500/20 bg-blue-500/5 text-blue-400 group-hover:border-blue-500/40',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 group-hover:border-emerald-500/40',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-400 group-hover:border-amber-500/40',
    rose: 'border-rose-500/20 bg-rose-500/5 text-rose-400 group-hover:border-rose-500/40',
    purple: 'border-purple-500/20 bg-purple-500/5 text-purple-400 group-hover:border-purple-500/40',
  };

  const Content = (
    <div className="relative p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm hover:bg-slate-900/90 transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-lg border transition-colors ${colorMap[colorScheme]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-slate-500 font-normal">
          {subtitle}
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo} className="block">{Content}</Link>;
  }

  return Content;
};
