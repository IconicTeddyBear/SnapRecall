import React, { useRef } from 'react';
import { Card, Deck, ReviewLog } from '../models/types';
import { deckUtils } from '../utils/deckUtils';
import { csvUtils } from '../utils/csvUtils';
import { StatCard } from '../components/StatCard';
import { Flame, BookOpen, CheckCircle2, Zap, Trophy, Download, Upload } from 'lucide-react';
import { useT } from '../i18n/useT';

interface DashboardViewProps {
  cards: Card[];
  decks: Deck[];
  logs: ReviewLog[];
  onStudyDeck: (deckId: string) => void;
  onSmartStart: () => void;
  onExport: () => void;
  onExportCSV: () => void;
  onImport: (data: Partial<Card>[]) => void;
  onCustomStudy: (query: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  cards, 
  decks, 
  logs,
  onStudyDeck, 
  onSmartStart,
  onExport,
  onExportCSV,
  onImport,
  onCustomStudy
}) => {
  const t = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        // Try parsing as JSON first
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          onImport(data);
          return;
        }
      } catch (error) {
        // Not JSON, try CSV
      }

      // CSV Parsing
      try {
        const cards = csvUtils.parseCSV(content);
        if (cards.length > 0) {
          onImport(cards);
        } else {
          alert('No valid cards found in CSV.');
        }
      } catch (error) {
        alert('Error parsing file. Please ensure it is a valid JSON or CSV.');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const dueCards = deckUtils.getDueCards(cards);
  const streak = deckUtils.getStreak(logs);

  // Calculate mastery for each deck
  const deckMasteryData = decks.map(deck => {
    const deckCards = cards.filter(c => deck.tags.some(t => c.tags.includes(t)));
    const mastery = deckUtils.getDeckMastery(deckCards);
    return { ...deck, mastery, cardCount: deckCards.length };
  }).filter(d => d.cardCount > 0); // Only show decks with cards

  const getMasteryColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    if (score >= 50) return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    if (score >= 20) return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Header Stats */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">{t.dashboard.greeting}</h1>
            <p className="text-slate-400 mt-1">{t.dashboard.greetingSubtitle}</p>
          </div>
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".json,.csv"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all border border-slate-700"
            >
              <Upload size={16} />
              {t.dashboard.importCards}
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-2 bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all border border-slate-700"
            >
              <Download size={16} />
              JSON
            </button>
            <button
              onClick={onExportCSV}
              className="flex items-center gap-2 bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all border border-slate-700"
            >
              <Download size={16} />
              CSV
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label={t.dashboard.dueToday}
            value={dueCards.length}
            icon={BookOpen}
            colorClass="bg-blue-500/10 text-blue-400 border border-blue-500/20"
          />
          <StatCard
            label={t.dashboard.streak}
            value={streak}
            icon={Flame}
            colorClass="bg-orange-500/10 text-orange-400 border border-orange-500/20"
          />
          <StatCard
            label={t.dashboard.totalCards}
            value={cards.length}
            icon={CheckCircle2}
            colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          />
        </div>
      </section>

      {/* Smart Start */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={onSmartStart}
          className="w-full group relative overflow-hidden bg-violet-600 text-white p-8 rounded-3xl shadow-xl hover:shadow-2xl hover:shadow-violet-500/20 transition-all active:scale-[0.99]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600" />
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          
          <div className="relative flex items-center justify-between">
            <div className="text-left space-y-2">
              <div className="flex items-center gap-2 text-violet-200 font-bold uppercase tracking-widest text-xs">
                <Zap size={16} className="fill-current" />
                {t.dashboard.recommendedForYou}
              </div>
              <h2 className="text-3xl font-bold">{t.dashboard.smartStartTitle}</h2>
              <p className="text-violet-100 max-w-md text-sm">
                {t.dashboard.smartStartDesc}
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            const query = prompt("Enter custom query (e.g. 'tag:anatomy due:7d'):");
            if (query) {
              onCustomStudy(query);
            }
          }}
          className="w-full group relative overflow-hidden bg-slate-800 text-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all active:scale-[0.99] border border-slate-700 hover:border-slate-600"
        >
          <div className="relative flex items-center justify-between">
            <div className="text-left space-y-2">
              <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs">
                <BookOpen size={16} className="fill-current" />
                {t.dashboard.filteredSession}
              </div>
              <h2 className="text-3xl font-bold text-slate-200">{t.dashboard.customStudy}</h2>
              <p className="text-slate-400 max-w-md text-sm">
                {t.dashboard.customStudyDesc}
              </p>
            </div>
          </div>
        </button>
      </section>

      {/* Mastery Heatmap */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Trophy size={20} className="text-slate-400" />
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t.dashboard.masteryHeatmap}</h2>
        </div>
        
        {deckMasteryData.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {deckMasteryData.map(deck => (
              <div 
                key={deck.id}
                onClick={() => onStudyDeck(deck.id)}
                className={`aspect-square rounded-3xl p-6 flex flex-col justify-between cursor-pointer transition-transform hover:scale-105 shadow-sm hover:shadow-md ${getMasteryColor(deck.mastery)}`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                    {deck.mastery}% {t.dashboard.masteryPercent}
                  </span>
                  {deck.mastery >= 80 && <CheckCircle2 size={16} className="opacity-80" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2">{deck.name}</h3>
                  <p className="text-xs font-medium opacity-80">{deck.cardCount} {t.dashboard.cards}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center">
            <p className="text-slate-400 font-medium">{t.dashboard.noDecks}</p>
          </div>
        )}
      </section>
    </div>
  );
};
