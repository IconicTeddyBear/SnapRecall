import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, colorClass }) => {
  return (
    <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
};
