/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { storageManager } from './utils/storageManager';
import { Card, Deck, ReviewLog } from './models/types';
import { DashboardView } from './views/DashboardView';
import { EditorView } from './views/EditorView';
import { StudyView } from './views/StudyView';
import { DecksView } from './views/DecksView';
import { AnalyticsView } from './views/AnalyticsView';
import { calculateNextReview } from './utils/srsAlgorithm';
import { deckUtils } from './utils/deckUtils';

type View = 'dashboard' | 'study' | 'editor' | 'decks' | 'analytics';

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | undefined>(undefined);
  const [editorContext, setEditorContext] = useState<{ tags?: string[], category?: string } | undefined>(undefined);
  const [studyMode, setStudyMode] = useState<'normal' | 'focus'>('normal');
  const [studyQueue, setStudyQueue] = useState<Card[]>([]);
  const [decksCategory, setDecksCategory] = useState<string | null>(null);

  useEffect(() => {
    const loadedCards = storageManager.getCards();
    const loadedDecks = storageManager.getDecks();
    const loadedLogs = storageManager.getLogs();
    
    setCards(loadedCards);
    setLogs(loadedLogs);
    
    let currentDecks = [...loadedDecks];
    if (currentDecks.length === 0) {
      const defaultDeck: Deck = {
        id: 'default',
        name: 'All Cards',
        tags: [],
        createdAt: Date.now()
      };
      currentDecks = [defaultDeck];
    }

    const existingTagDecks = new Set(currentDecks.map(d => d.name.toLowerCase()));
    const allTags = new Set(loadedCards.flatMap(c => c.tags));
    let decksUpdated = false;

    allTags.forEach(tag => {
      const tagName = tag.charAt(0).toUpperCase() + tag.slice(1);
      if (!existingTagDecks.has(tagName.toLowerCase())) {
        const newDeck: Deck = {
          id: crypto.randomUUID(),
          name: tagName,
          tags: [tag.toLowerCase()],
          createdAt: Date.now()
        };
        currentDecks.push(newDeck);
        existingTagDecks.add(tagName.toLowerCase());
        decksUpdated = true;
      }
    });

    setDecks(currentDecks);
    if (decksUpdated || loadedDecks.length === 0) {
      storageManager.saveDecks(currentDecks);
    }
  }, []);

  const prepareStudyQueue = (cardsToProcess: Card[], mode: 'normal' | 'focus') => {
    let finalQueue = [...cardsToProcess];
    
    if (mode === 'focus') {
      finalQueue = finalQueue.filter(c => (c.difficultyScore || 0) >= 4);
    } else {
      // Normal mode: Study ALL cards in the deck/category.
      // Prioritize due cards by putting them first, but include everything.
      const dueCards = deckUtils.getDueCards(finalQueue);
      const notDueCards = finalQueue.filter(c => !dueCards.includes(c));
      
      // Shuffle both groups independently
      const shuffledDue = deckUtils.getWeightedCards(dueCards);
      const shuffledNotDue = deckUtils.getWeightedCards(notDueCards);
      
      // Combine: Due cards first, then the rest
      finalQueue = [...shuffledDue, ...shuffledNotDue];
    }
    return finalQueue;
  };

  const handleStudyDeck = (deckId: string, mode: 'normal' | 'focus' = 'normal') => {
    setActiveDeckId(deckId);
    setStudyMode(mode);
    
    const activeDeck = decks.find(d => d.id === deckId);
    let cardsToStudy = deckId === 'default' 
      ? cards
      : cards.filter(c => activeDeck?.tags.some(t => c.tags.includes(t)));

    const queue = prepareStudyQueue(cardsToStudy, mode);
    setStudyQueue(queue);
    setCurrentView('study');
  };

  const handleStudyCategory = (category: string, mode: 'normal' | 'focus' = 'normal') => {
    setActiveDeckId(null); // No specific deck ID for category study
    setStudyMode(mode);
    
    const cardsToStudy = cards.filter(c => c.category === category);
    const queue = prepareStudyQueue(cardsToStudy, mode);
    
    setStudyQueue(queue);
    setCurrentView('study');
  };

  const handleCopyCard = (card: Card) => {
    const newCard: Card = {
      ...card,
      id: crypto.randomUUID(),
      repetition: 0,
      interval: 0,
      easiness: 2.5,
      nextReviewDate: Date.now(),
      difficultyScore: 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    // Insert the new card directly after the original card
    const index = cards.findIndex(c => c.id === card.id);
    const newCards = [...cards];
    if (index !== -1) {
      newCards.splice(index + 1, 0, newCard);
    } else {
      newCards.push(newCard);
    }
    
    setCards(newCards);
    storageManager.saveCards(newCards);
  };

  const handleSmartStart = () => {
    const deckId = deckUtils.getSmartStartDeck(decks, cards);
    if (deckId) {
      handleStudyDeck(deckId, 'normal');
    } else {
      alert("No decks available to study!");
    }
  };

  const handleGradeCard = (card: Card, quality: number) => {
    const updatedCard = calculateNextReview(card, quality);
    const newCards = cards.map(c => c.id === card.id ? updatedCard : c);
    setCards(newCards);
    storageManager.saveCards(newCards);

    // Record review log
    const newLog: ReviewLog = {
      id: crypto.randomUUID(),
      cardId: card.id,
      quality,
      easiness: updatedCard.easiness,
      interval: updatedCard.interval,
      timestamp: Date.now(),
    };
    const newLogs = [...logs, newLog];
    setLogs(newLogs);
    storageManager.saveLogs(newLogs);
  };

  const [lastDeletedCard, setLastDeletedCard] = useState<{card: Card, index: number} | null>(null);

  const handleDeleteCard = (cardId: string) => {
    const index = cards.findIndex(c => c.id === cardId);
    if (index !== -1) {
      setLastDeletedCard({ card: cards[index], index });
      const newCards = cards.filter(c => c.id !== cardId);
      setCards(newCards);
      storageManager.saveCards(newCards);
    }
  };

  const handleUndoDelete = () => {
    if (lastDeletedCard) {
      const newCards = [...cards];
      newCards.splice(lastDeletedCard.index, 0, lastDeletedCard.card);
      setCards(newCards);
      storageManager.saveCards(newCards);
      setLastDeletedCard(null);
      return true;
    }
    return false;
  };

  const handleImportCards = (importedData: Partial<Card>[]) => {
    const newCards = [...cards];
    const now = Date.now();
    
    importedData.forEach(data => {
      const newCard: Card = {
        id: crypto.randomUUID(),
        front: data.front || '',
        back: data.back || '',
        category: data.category,
        tags: data.tags || [],
        repetition: 0,
        interval: 0,
        easiness: 2.5,
        nextReviewDate: now,
        difficultyScore: 3,
        createdAt: now,
        updatedAt: now,
      };
      newCards.push(newCard);
    });

    setCards(newCards);
    storageManager.saveCards(newCards);

    // Trigger deck creation logic by "saving" the last imported card's tags
    // or just let the useEffect on load handle it if we refresh, 
    // but better to do it now.
    const allImportedTags = importedData.flatMap(d => d.tags || []);
    if (allImportedTags.length > 0) {
      const existingTagDecks = new Set(decks.map(d => d.name.toLowerCase()));
      const newDecks = [...decks];
      let decksUpdated = false;

      Array.from(new Set(allImportedTags)).forEach(tag => {
        const tagName = tag.charAt(0).toUpperCase() + tag.slice(1);
        if (!existingTagDecks.has(tagName.toLowerCase())) {
          const newDeck: Deck = {
            id: crypto.randomUUID(),
            name: tagName,
            tags: [tag.toLowerCase()],
            createdAt: Date.now()
          };
          newDecks.push(newDeck);
          existingTagDecks.add(tagName.toLowerCase());
          decksUpdated = true;
        }
      });

      if (decksUpdated) {
        setDecks(newDecks);
        storageManager.saveDecks(newDecks);
      }
    }
  };

  const handleSaveCard = (cardData: Partial<Card>) => {
    const newCards = [...cards];
    if (cardData.id) {
      const index = newCards.findIndex(c => c.id === cardData.id);
      if (index !== -1) {
        newCards[index] = { 
          ...newCards[index], 
          ...cardData, 
          updatedAt: Date.now() 
        } as Card;
      }
    } else {
      const newCard: Card = {
        id: crypto.randomUUID(),
        front: cardData.front || '',
        back: cardData.back || '',
        category: cardData.category,
        tags: cardData.tags || [],
        repetition: 0,
        interval: 0,
        easiness: 2.5,
        nextReviewDate: Date.now(),
        difficultyScore: 3,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      newCards.push(newCard);
    }
    
    setCards(newCards);
    storageManager.saveCards(newCards);

    // Automatically create Smart Decks for new tags
    if (cardData.tags) {
      const existingTagDecks = new Set(decks.map(d => d.name.toLowerCase()));
      const newDecks = [...decks];
      let decksUpdated = false;

      cardData.tags.forEach(tag => {
        const tagName = tag.charAt(0).toUpperCase() + tag.slice(1);
        if (!existingTagDecks.has(tagName.toLowerCase())) {
          const newDeck: Deck = {
            id: crypto.randomUUID(),
            name: tagName,
            tags: [tag.toLowerCase()],
            createdAt: Date.now()
          };
          newDecks.push(newDeck);
          existingTagDecks.add(tagName.toLowerCase());
          decksUpdated = true;
        }
      });

      if (decksUpdated) {
        setDecks(newDecks);
        storageManager.saveDecks(newDecks);
      }
    }

    setEditingCard(undefined);
    setEditorContext(undefined);
    setCurrentView('decks'); // Go back to decks after saving
  };

  const handleExportCards = () => {
    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flashcards_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['id', 'front', 'back', 'category', 'tags'];
    const csvContent = [
      headers.join(','),
      ...cards.map(card => {
        const tags = card.tags.join(';');
        const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
        return [
          card.id,
          escape(card.front),
          escape(card.back),
          escape(card.category || ''),
          escape(tags)
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flashcards_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateNew = (initialTags?: string[], initialCategory?: string) => {
    setEditingCard(undefined);
    setEditorContext({ tags: initialTags, category: initialCategory });
    setCurrentView('editor');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView 
            cards={cards} 
            decks={decks} 
            logs={logs}
            onStudyDeck={handleStudyDeck}
            onSmartStart={handleSmartStart}
            onExport={handleExportCards}
            onExportCSV={handleExportCSV}
            onImport={handleImportCards}
          />
        );
      case 'decks':
        return (
          <DecksView 
            cards={cards}
            decks={decks}
            onStudyDeck={handleStudyDeck}
            onStudyCategory={handleStudyCategory}
            onCreateCard={handleCreateNew}
            onEditCard={(card) => {
              setEditingCard(card);
              setCurrentView('editor');
            }}
            onCopyCard={handleCopyCard}
            onDeleteCard={handleDeleteCard}
            selectedCategory={decksCategory}
            onSelectCategory={setDecksCategory}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView 
            cards={cards}
            logs={logs}
          />
        );
      case 'study':
        const activeDeck = decks.find(d => d.id === activeDeckId);
        return (
          <StudyView 
            cards={studyQueue}
            onGrade={handleGradeCard}
            onDelete={handleDeleteCard}
            onUndo={handleUndoDelete}
            onFinish={() => setCurrentView('dashboard')}
            onAddCard={() => {
              if (activeDeck && activeDeck.id !== 'default') {
                const deckCards = cards.filter(c => activeDeck.tags.some(t => c.tags.includes(t)));
                const likelyCategory = deckCards.length > 0 ? deckCards[0].category : undefined;
                handleCreateNew(activeDeck.tags, likelyCategory);
              } else {
                handleCreateNew();
              }
            }}
          />
        );
      case 'editor':
        const categories = Array.from(new Set(cards.map(c => c.category).filter((c): c is string => !!c)));
        return (
          <EditorView 
            card={editingCard}
            categories={categories}
            initialTags={editorContext?.tags}
            initialCategory={editorContext?.category}
            onSave={handleSaveCard}
            onCancel={() => {
              setEditingCard(undefined);
              setEditorContext(undefined);
              setCurrentView('decks');
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-violet-500 selection:text-white">
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setCurrentView('dashboard')}
          >
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-500/20">
              <div className="w-4 h-4 border-2 border-white rounded-sm" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">Elite Flashcards</h1>
          </div>
          <nav className="flex gap-6">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`text-sm font-bold transition-colors ${currentView === 'dashboard' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setCurrentView('decks')}
              className={`text-sm font-bold transition-colors ${currentView === 'decks' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Decks
            </button>
            <button 
              onClick={() => setCurrentView('analytics')}
              className={`text-sm font-bold transition-colors ${currentView === 'analytics' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Analytics
            </button>
          </nav>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto p-6 py-10">
        {renderView()}
      </main>
    </div>
  );
}
