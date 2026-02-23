import React, { useState } from 'react';
import { UserSettings } from '../models/types';
import { Save } from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave }) => {
  const [targetRetention, setTargetRetention] = useState((settings.targetRetention * 100).toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const retention = parseFloat(targetRetention) / 100;
    if (retention >= 0.7 && retention <= 0.99) {
      onSave({ ...settings, targetRetention: retention });
      alert('Settings saved successfully!');
    } else {
      alert('Retention rate must be between 70% and 99%');
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-slate-400 text-sm">Configure your flashcard experience.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-200">
            Target Retention Rate (%)
          </label>
          <p className="text-xs text-slate-400 mb-2">
            The FSRS algorithm will adjust intervals to ensure you remember this percentage of cards. 
            Higher retention means more frequent reviews. Recommended: 85% - 95%.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="70"
              max="99"
              step="1"
              value={targetRetention}
              onChange={(e) => setTargetRetention(e.target.value)}
              className="w-32 p-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all font-medium text-white"
              required
            />
            <span className="text-slate-400 font-medium">%</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-700">
          <button
            type="submit"
            className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-500 transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20 active:scale-[0.98]"
          >
            <Save size={18} />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
