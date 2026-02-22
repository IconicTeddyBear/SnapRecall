import React, { useRef } from 'react';
import { Card, Deck, ReviewLog } from '../models/types';
import { deckUtils } from '../utils/deckUtils';
import { StatCard } from '../components/StatCard';
import { Flame, BookOpen, CheckCircle2, Zap, Trophy, Download, Upload } from 'lucide-react';

interface DashboardViewProps {
  cards: Card[];
  decks: Deck[];
  logs: ReviewLog[];
  onStudyDeck: (deckId: string) => void;
  onSmartStart: () => void;
  onExport: () => void;
  onExportCSV: () => void;
  onImport: (data: Partial<Card>[]) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  cards, 
  decks, 
  logs,
  onStudyDeck, 
  onSmartStart,
  onExport,
  onExportCSV,
  onImport
}) => {
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
        const lines = content.split('\n');
        if (lines.length < 2) throw new Error('Invalid CSV');
        
        const headers = lines[0].split(',').map(h => h.trim());
        const cards: Partial<Card>[] = [];
        
        // Simple CSV parser (handles quotes)
        const parseCSVLine = (line: string) => {
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current);
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current);
          return result;
        };

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const values = parseCSVLine(line);
          const card: any = {};
          
          headers.forEach((header, index) => {
            if (header === 'tags') {
              card[header] = values[index] ? values[index].split(';').map(t => t.trim()).filter(Boolean) : [];
            } else {
              card[header] = values[index];
            }
          });
          
          if (card.front && card.back) {
            cards.push(card);
          }
        }
        
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
            <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back!</h1>
            <p className="text-slate-400 mt-1">Ready to crush your goals today?</p>
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
              Import
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
            label="Due Today" 
            value={dueCards.length} 
            icon={BookOpen} 
            colorClass="bg-blue-500/10 text-blue-400 border border-blue-500/20" 
          />
          <StatCard 
            label="Day Streak" 
            value={streak} 
            icon={Flame} 
            colorClass="bg-orange-500/10 text-orange-400 border border-orange-500/20" 
          />
          <StatCard 
            label="Total Cards" 
            value={cards.length} 
            icon={CheckCircle2} 
            colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
          />
        </div>
      </section>

      {/* Smart Start */}
      <section>
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
                Recommended for you
              </div>
              <h2 className="text-3xl font-bold">Start Focus Session</h2>
              <p className="text-violet-100 max-w-md">
                We've selected the best cards for you to review right now based on your retention and due dates.
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl group-hover:scale-110 transition-transform backdrop-blur-sm border border-white/10">
              <Zap size={32} className="text-white" />
            </div>
          </div>
        </button>
      </section>

      {/* Mastery Heatmap */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Trophy size={20} className="text-slate-400" />
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Mastery Heatmap</h2>
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
                    {deck.mastery}% Mastery
                  </span>
                  {deck.mastery >= 80 && <CheckCircle2 size={16} className="opacity-80" />}
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2">{deck.name}</h3>
                  <p className="text-xs font-medium opacity-80">{deck.cardCount} cards</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-2xl p-12 text-center">
            <p className="text-slate-400 font-medium">Create decks to see your mastery map!</p>
          </div>
        )}
      </section>
    </div>
  );
};
