import React, { useState, useMemo } from 'react';
import { Card, Deck } from '../models/types';
import { ChevronRight, Folder, Tag, Play, BookOpen, Plus, Search, Zap, Copy, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DecksViewProps {
  cards: Card[];
  decks: Deck[];
  onStudyDeck: (deckId: string, mode?: 'normal' | 'focus') => void;
  onStudyCategory: (category: string, mode?: 'normal' | 'focus') => void;
  onCreateCard: (initialTags?: string[], initialCategory?: string) => void;
  onEditCard: (card: Card) => void;
  onCopyCard: (card: Card) => void;
  onDeleteCard: (cardId: string) => void;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export const DecksView: React.FC<DecksViewProps> = ({
  cards,
  decks,
  onStudyDeck,
  onStudyCategory,
  onCreateCard,
  onEditCard,
  onCopyCard,
  onDeleteCard,
  selectedCategory,
  onSelectCategory
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmCardId, setDeleteConfirmCardId] = useState<string | null>(null);

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

  const dueCardsCount = useMemo(() => {
    const now = Date.now();
    return cards.filter(c => c.nextReviewDate <= now).length;
  }, [cards]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Library</h2>
          <p className="text-slate-400 text-sm">Browse your collection by category and tag.</p>
        </div>
        <button
          onClick={() => onStudyDeck('default')}
          className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20 active:scale-95"
        >
          <Play size={18} fill="currentColor" />
          Study All ({dueCardsCount} Due)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-200px)]">
        {/* Categories List (Sidebar) */}
        <div className="lg:col-span-4 space-y-4 overflow-y-auto pr-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest sticky top-0 bg-slate-950 py-2 z-10">Categories</h3>
          <div className="grid gap-2">
            {categories.map(([cat, tags]) => (
              <button
                key={cat}
                onClick={() => {
                  onSelectCategory(cat === selectedCategory ? null : cat);
                  setSearchQuery('');
                }}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left w-full ${
                  selectedCategory === cat
                    ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Folder size={20} className={selectedCategory === cat ? 'text-white' : 'text-slate-400'} />
                  <div className="truncate">
                    <p className="font-bold truncate">{cat}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-tight truncate ${selectedCategory === cat ? 'text-violet-200' : 'text-slate-500'}`}>
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
        <div className="lg:col-span-8 bg-slate-800 rounded-3xl border border-slate-700 shadow-sm overflow-hidden flex flex-col">
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
                <div className="p-6 border-b border-slate-700 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedCategory}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {selectedCategoryCards.length} Cards • {selectedCategoryCards.filter(c => c.nextReviewDate <= Date.now()).length} Due
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onCreateCard(undefined, selectedCategory)}
                        className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-600 transition-all border border-slate-600"
                      >
                        <Plus size={16} />
                        Add Card
                      </button>
                      <button
                        onClick={() => {
                          if (selectedCategory) onStudyCategory(selectedCategory, 'focus');
                        }}
                        className="flex items-center gap-2 bg-rose-500/10 text-rose-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-all border border-rose-500/20"
                      >
                        <Zap size={16} />
                        Weak Points
                      </button>
                      <button
                        onClick={() => {
                          if (selectedCategory) onStudyCategory(selectedCategory);
                        }}
                        className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20"
                      >
                        <Play size={16} fill="currentColor" />
                        Study Category
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Search in ${selectedCategory}...`}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all font-medium text-sm text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                {/* Cards List */}
                <div className="flex-1 overflow-y-auto p-2">
                  {filteredCards.length > 0 ? (
                    <div className="grid gap-2">
                      {filteredCards.map(card => (
                        <div key={card.id} className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-700/50 transition-all group cursor-pointer">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-200 text-sm line-clamp-2 mb-1">{card.front}</p>
                              <div className="flex flex-wrap gap-1">
                                {card.tags.map(tag => (
                                  <span key={tag} className="text-[10px] font-bold text-slate-400 uppercase tracking-tight bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">#{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                                card.interval > 21 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                card.interval > 7 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              }`}>
                                {card.interval > 21 ? 'Mastered' : card.interval > 7 ? 'Learning' : 'New'}
                              </span>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditCard(card);
                                  }}
                                  className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-tight transition-colors"
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCopyCard(card);
                                  }}
                                  className="text-slate-500 hover:text-white transition-colors"
                                  title="Copy"
                                >
                                  <Copy size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmCardId(card.id);
                                  }}
                                  className="text-slate-500 hover:text-rose-400 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <p className="text-slate-500 font-medium text-sm">No cards found.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <BookOpen size={48} className="text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Select a Category</h3>
                <p className="text-slate-400 font-medium max-w-xs">Choose a category from the left to browse cards, manage your deck, and start studying.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmCardId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6 border border-slate-800"
            >
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Delete this card?</h3>
                <p className="text-slate-400 mt-2">This action cannot be undone. All SRS progress for this card will be lost.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onDeleteCard(deleteConfirmCardId);
                    setDeleteConfirmCardId(null);
                  }}
                  className="flex-1 bg-rose-500 text-white py-3 rounded-2xl font-bold hover:bg-rose-600 transition-all active:scale-95"
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirmCardId(null)}
                  className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-2xl font-bold hover:bg-slate-700 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
