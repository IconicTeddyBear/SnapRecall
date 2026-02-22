import React from 'react';
import { Play } from 'lucide-react';

interface SmartDeckCardProps {
  name: string;
  dueCount: number;
  totalCount: number;
  onStudy: () => void;
}

export const SmartDeckCard: React.FC<SmartDeckCardProps> = ({ name, dueCount, totalCount, onStudy }) => {
  return (
    <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm hover:border-slate-500 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
          <div className="flex gap-2">
            <span className="text-xs font-semibold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
              {dueCount} Due
            </span>
            <span className="text-xs font-semibold px-2 py-1 bg-slate-700 text-slate-300 rounded-md border border-slate-600">
              {totalCount} Total
            </span>
          </div>
        </div>
        <button 
          onClick={onStudy}
          className="p-2 bg-violet-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-violet-500/20"
        >
          <Play size={18} fill="currentColor" />
        </button>
      </div>
      <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-emerald-500 h-full transition-all duration-500" 
          style={{ width: `${totalCount > 0 ? (dueCount / totalCount) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
};
