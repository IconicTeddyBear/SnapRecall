import React from 'react';
import { Card, Deck, ReviewLog } from '../models/types';
import { deckUtils } from '../utils/deckUtils';
import { StatCard } from '../components/StatCard';
import { Flame, BookOpen, CheckCircle2, Zap, Trophy } from 'lucide-react';

interface DashboardViewProps {
  cards: Card[];
  decks: Deck[];
  logs: ReviewLog[];
  onStudyDeck: (deckId: string) => void;
  onSmartStart: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  cards, 
  decks, 
  logs,
  onStudyDeck, 
  onSmartStart
}) => {
  const dueCards = deckUtils.getDueCards(cards);
  const streak = deckUtils.getStreak(logs);

  // Calculate mastery for each deck
  const deckMasteryData = decks.map(deck => {
    const deckCards = cards.filter(c => deck.tags.some(t => c.tags.includes(t)));
    const mastery = deckUtils.getDeckMastery(deckCards);
    return { ...deck, mastery, cardCount: deckCards.length };
  }).filter(d => d.cardCount > 0); // Only show decks with cards

  const getMasteryColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500 text-white';
    if (score >= 50) return 'bg-yellow-500 text-white';
    if (score >= 20) return 'bg-orange-500 text-white';
    return 'bg-rose-500 text-white';
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Header Stats */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Welcome back!</h1>
            <p className="text-zinc-500 mt-1">Ready to crush your goals today?</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            label="Due Today" 
            value={dueCards.length} 
            icon={BookOpen} 
            colorClass="bg-blue-50 text-blue-600" 
          />
          <StatCard 
            label="Day Streak" 
            value={streak} 
            icon={Flame} 
            colorClass="bg-orange-50 text-orange-600" 
          />
          <StatCard 
            label="Total Cards" 
            value={cards.length} 
            icon={CheckCircle2} 
            colorClass="bg-emerald-50 text-emerald-600" 
          />
        </div>
      </section>

      {/* Smart Start */}
      <section>
        <button
          onClick={onSmartStart}
          className="w-full group relative overflow-hidden bg-zinc-900 text-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all active:scale-[0.99]"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-zinc-900" />
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          
          <div className="relative flex items-center justify-between">
            <div className="text-left space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-xs">
                <Zap size={16} className="fill-current" />
                Recommended for you
              </div>
              <h2 className="text-3xl font-bold">Start Focus Session</h2>
              <p className="text-zinc-400 max-w-md">
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
          <Trophy size={20} className="text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Mastery Heatmap</h2>
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
          <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl p-12 text-center">
            <p className="text-zinc-400 font-medium">Create decks to see your mastery map!</p>
          </div>
        )}
      </section>
    </div>
  );
};
