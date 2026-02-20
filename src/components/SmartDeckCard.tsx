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
    <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:border-zinc-300 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">{name}</h3>
          <div className="flex gap-2">
            <span className="text-xs font-semibold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">
              {dueCount} Due
            </span>
            <span className="text-xs font-semibold px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md">
              {totalCount} Total
            </span>
          </div>
        </div>
        <button 
          onClick={onStudy}
          className="p-2 bg-zinc-900 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Play size={18} fill="currentColor" />
        </button>
      </div>
      <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-emerald-500 h-full transition-all duration-500" 
          style={{ width: `${totalCount > 0 ? (dueCount / totalCount) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
};
