import React, { useState, useMemo } from 'react';
import { Card, Deck } from '../models/types';
import { ChevronRight, Folder, Tag, Play, BookOpen, Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DecksViewProps {
  cards: Card[];
  decks: Deck[];
  onStudyDeck: (deckId: string, mode?: 'normal' | 'focus') => void;
  onCreateCard: (initialTags?: string[], initialCategory?: string) => void;
  onEditCard: (card: Card) => void;
}

export const DecksView: React.FC<DecksViewProps> = ({ cards, decks, onStudyDeck, onCreateCard, onEditCard }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useMemo(() => {
    const catMap = new Map<string, Set<string>>();
    cards.forEach(card => {
      const cat = card.category || 'Uncategorized';
      if (!catMap.has(cat)) catMap.set(cat, new Set());
      card.tags.forEach(tag => catMap.get(cat)!.add(tag));
    });
    return Array.from(catMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [cards]);

  const selectedCategoryCards = useMemo(() => {
    if (!selectedCategory) return [];
    return cards.filter(c => (c.category || 'Uncategorized') === selectedCategory);
  }, [cards, selectedCategory]);

  const filteredCards = useMemo(() => {
    if (!searchQuery) return selectedCategoryCards;
    return selectedCategoryCards.filter(card => 
      card.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.back.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [selectedCategoryCards, searchQuery]);

  const dueCardsCount = cards.filter(c => c.nextReviewDate <= Date.now()).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Library</h2>
          <p className="text-zinc-500 text-sm">Browse your collection by category and tag.</p>
        </div>
        <button 
          onClick={() => onStudyDeck('default')}
          className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 active:scale-95"
        >
          <Play size={18} fill="currentColor" />
          Study Due ({dueCardsCount})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-200px)]">
        {/* Categories List (Sidebar) */}
        <div className="lg:col-span-4 space-y-4 overflow-y-auto pr-2">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest sticky top-0 bg-zinc-50 py-2 z-10">Categories</h3>
          <div className="grid gap-2">
            {categories.map(([cat, tags]) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat === selectedCategory ? null : cat);
                  setSearchQuery('');
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left w-full ${
                  selectedCategory === cat 
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-200' 
                    : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-400'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Folder size={20} className={selectedCategory === cat ? 'text-zinc-400' : 'text-zinc-400'} />
                  <div className="truncate">
                    <p className="font-bold truncate">{cat}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-tight truncate ${selectedCategory === cat ? 'text-zinc-400' : 'text-zinc-400'}`}>
                      {tags.size} Tags • {cards.filter(c => (c.category || 'Uncategorized') === cat).length} Cards
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className={`transition-transform flex-none ${selectedCategory === cat ? 'rotate-90' : ''}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Selected Category Details (Main Content) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {selectedCategory ? (
              <motion.div 
                key={selectedCategory}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                {/* Header */}
                <div className="p-6 border-b border-zinc-100 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900">{selectedCategory}</h3>
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        {selectedCategoryCards.length} Cards • {selectedCategoryCards.filter(c => c.nextReviewDate <= Date.now()).length} Due
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onCreateCard(undefined, selectedCategory)}
                        className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-all"
                      >
                        <Plus size={16} />
                        Add Card
                      </button>
                      <button
                        onClick={() => {
                          const tags = Array.from(categories.find(([c]) => c === selectedCategory)![1]);
                          const deck = decks.find(d => tags.includes(d.name.toLowerCase()) || d.tags.some(t => tags.includes(t)));
                          if (deck) onStudyDeck(deck.id, 'focus');
                          else onStudyDeck('default', 'focus');
                        }}
                        className="flex items-center gap-2 bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all"
                      >
                        <Zap size={16} />
                        Weak Points
                      </button>
                      <button
                        onClick={() => {
                          const tags = Array.from(categories.find(([c]) => c === selectedCategory)![1]);
                          const deck = decks.find(d => tags.includes(d.name.toLowerCase()) || d.tags.some(t => tags.includes(t)));
                          if (deck) onStudyDeck(deck.id);
                          else onStudyDeck('default');
                        }}
                        className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all"
                      >
                        <Play size={16} fill="currentColor" />
                        Study Deck
                      </button>
                    </div>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search in ${selectedCategory}...`}
                      className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all font-medium text-sm"
                    />
                  </div>
                </div>

                {/* Cards List */}
                <div className="flex-1 overflow-y-auto p-2">
                  {filteredCards.length > 0 ? (
                    <div className="grid gap-2">
                      {filteredCards.map(card => (
                        <div key={card.id} className="p-4 rounded-xl border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 transition-all group cursor-pointer">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-zinc-900 text-sm line-clamp-2 mb-1">{card.front}</p>
                              <div className="flex flex-wrap gap-1">
                                {card.tags.map(tag => (
                                  <span key={tag} className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight bg-zinc-100 px-1.5 py-0.5 rounded">#{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                                card.interval > 21 ? 'bg-emerald-100 text-emerald-600' :
                                card.interval > 7 ? 'bg-blue-100 text-blue-600' :
                                'bg-orange-100 text-orange-600'
                              }`}>
                                {card.interval > 21 ? 'Mastered' : card.interval > 7 ? 'Learning' : 'New'}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditCard(card);
                                }}
                                className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-tight mt-2"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <p className="text-zinc-400 font-medium text-sm">No cards found.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <BookOpen size={48} className="text-zinc-300 mb-4" />
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Select a Category</h3>
                <p className="text-zinc-400 font-medium max-w-xs">Choose a category from the left to browse cards, manage your deck, and start studying.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
