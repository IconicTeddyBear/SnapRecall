import React from 'react';

interface GradingButtonsProps {
  onGrade: (quality: number) => void;
}

export const GradingButtons: React.FC<GradingButtonsProps> = ({ onGrade }) => {
  const buttons = [
    { label: 'Hard', quality: 1, color: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' },
    { label: 'Good', quality: 3, color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' },
    { label: 'Easy', quality: 5, color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' },
  ];

  return (
    <div className="flex gap-4 w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-500">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={(e) => {
            e.stopPropagation();
            onGrade(btn.quality);
          }}
          className={`flex-1 py-4 rounded-2xl font-bold border-2 transition-all active:scale-95 ${btn.color}`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
};
