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

  const handleStudyDeck = (deckId: string, mode: 'normal' | 'focus' = 'normal') => {
    setActiveDeckId(deckId);
    setStudyMode(mode);
    setCurrentView('study');
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
          />
        );
      case 'decks':
        return (
          <DecksView 
            cards={cards}
            decks={decks}
            onStudyDeck={handleStudyDeck}
            onCreateCard={handleCreateNew}
            onEditCard={(card) => {
              setEditingCard(card);
              setCurrentView('editor');
            }}
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
        let sessionCards = activeDeckId === 'default' 
          ? cards
          : cards.filter(c => activeDeck?.tags.some(t => c.tags.includes(t)));

        if (studyMode === 'focus') {
          sessionCards = sessionCards.filter(c => (c.difficultyScore || 0) >= 4);
        } else {
          // Normal mode: Due cards + Weighted Shuffle
          sessionCards = deckUtils.getDueCards(sessionCards);
          sessionCards = deckUtils.getWeightedCards(sessionCards);
        }

        return (
          <StudyView 
            cards={sessionCards}
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setCurrentView('dashboard')}
          >
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rounded-sm" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900">Elite Flashcards</h1>
          </div>
          <nav className="flex gap-6">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`text-sm font-bold transition-colors ${currentView === 'dashboard' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setCurrentView('decks')}
              className={`text-sm font-bold transition-colors ${currentView === 'decks' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Decks
            </button>
            <button 
              onClick={() => setCurrentView('analytics')}
              className={`text-sm font-bold transition-colors ${currentView === 'analytics' ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
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
