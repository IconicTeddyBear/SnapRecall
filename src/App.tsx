import React, { useState } from 'react';
import { Card, Deck, ReviewLog } from './models/types';
import { DashboardView } from './views/DashboardView';
import { EditorView } from './views/EditorView';
import { StudyView } from './views/StudyView';
import { DecksView } from './views/DecksView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { calculateNextReview } from './utils/srsAlgorithm';
import { deckUtils } from './utils/deckUtils';
import { csvUtils } from './utils/csvUtils';
import { translateCard } from './utils/aiTranslator';
import { StorageProvider, useStorage } from './contexts/StorageContext';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { ErrorBoundary } from './components/ErrorBoundary';

type View = 'dashboard' | 'study' | 'editor' | 'decks' | 'analytics' | 'settings';

function MainApp() {
  const { cards, decks, logs, settings, loading, addCard, updateCard, deleteCard, addLog, importCards, saveSettings } = useStorage();
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | undefined>(undefined);
  const [editorContext, setEditorContext] = useState<{ tags?: string[], category?: string } | undefined>(undefined);
  const [studyMode, setStudyMode] = useState<'normal' | 'focus'>('normal');
  const [studyQueue, setStudyQueue] = useState<Card[]>([]);
  const [decksCategory, setDecksCategory] = useState<string | null>(null);

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
      // FSRS fields reset to new-card state
      due: Date.now(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: undefined,
      // Legacy compat
      repetition: 0,
      interval: 0,
      easiness: 2.5,
      nextReviewDate: Date.now(),
      difficultyScore: 3,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    addCard(newCard);
  };

  const handleSmartStart = () => {
    const deckId = deckUtils.getSmartStartDeck(decks, cards);
    if (deckId) {
      handleStudyDeck(deckId, 'normal');
    } else {
      alert("No decks available to study!");
    }
  };

  const [translatingCategory, setTranslatingCategory] = useState<string | null>(null);

  const handleTranslateCategory = async (category: string) => {
    if (translatingCategory) return;
    
    const cardsToTranslate = cards.filter(c => 
      c.category === category && 
      !c.frontTranslation && 
      !c.backTranslation && 
      (c.front || c.back)
    );

    if (cardsToTranslate.length === 0) {
      alert("All cards in this category are already translated.");
      return;
    }

    setTranslatingCategory(category);
    let successCount = 0;

    for (const card of cardsToTranslate) {
      try {
        const { frontTranslation, backTranslation } = await translateCard(card.front, card.back, settings.targetLanguage);
        await updateCard({
          ...card,
          frontTranslation,
          backTranslation,
          updatedAt: Date.now()
        });
        successCount++;
        // Wait to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        console.error("Auto-translate failed for card", card.id, e);
        // Wait longer on error
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    setTranslatingCategory(null);
    alert(`Translated ${successCount} out of ${cardsToTranslate.length} cards.`);
  };

  const handleCustomStudy = (query: string) => {
    const terms = query.toLowerCase().split(' ');

    let filteredCards = cards;

    for (const term of terms) {
      if (term.startsWith('tag:')) {
        const tag = term.split(':')[1];
        filteredCards = filteredCards.filter(c => c.tags.some(t => t.toLowerCase().includes(tag)));
      } else if (term.startsWith('due:')) {
        const daysStr = term.split(':')[1].replace('d', '');
        const days = parseInt(daysStr, 10);
        if (!isNaN(days)) {
          const targetTime = Date.now() + days * 24 * 60 * 60 * 1000;
          filteredCards = filteredCards.filter(c => (c.due || c.nextReviewDate || 0) <= targetTime);
        }
      } else if (term.startsWith('wrong:')) {
        const daysStr = term.split(':')[1].replace('d', '');
        const days = parseInt(daysStr, 10);
        if (!isNaN(days)) {
          const targetTime = Date.now() - days * 24 * 60 * 60 * 1000;
          const wrongCardIds = new Set(
            logs.filter(l => l.quality <= 2 && l.timestamp >= targetTime).map(l => l.cardId)
          );
          filteredCards = filteredCards.filter(c => wrongCardIds.has(c.id));
        }
      }
    }

    if (filteredCards.length > 0) {
      setActiveDeckId(null);
      setStudyMode('normal');
      setStudyQueue(deckUtils.getWeightedCards(filteredCards));
      setCurrentView('study');
    } else {
      alert("No cards found matching your query.");
    }
  };

  const handleGradeCard = (card: Card, quality: number) => {
    const { updatedCard, log } = calculateNextReview(card, quality, settings);
    updateCard(updatedCard);

    // Record review log
    const newLog: ReviewLog = {
      id: crypto.randomUUID(),
      cardId: card.id,
      quality,
      elapsed_days: log.elapsed_days,
      scheduled_days: log.scheduled_days,
      review: log.review.getTime(),
      state: log.state,
      timestamp: Date.now(),
    };
    addLog(newLog);
  };

  const [lastDeletedCard, setLastDeletedCard] = useState<{card: Card, index: number} | null>(null);

  const handleDeleteCard = (cardId: string) => {
    const index = cards.findIndex(c => c.id === cardId);
    if (index !== -1) {
      setLastDeletedCard({ card: cards[index], index });
      deleteCard(cardId);
    }
  };

  const handleUndoDelete = () => {
    if (lastDeletedCard) {
      addCard(lastDeletedCard.card);
      setLastDeletedCard(null);
      return true;
    }
    return false;
  };

  const handleImportCards = (importedData: Partial<Card>[]) => {
    importCards(importedData);
  };

  const handleSaveCard = (cardData: Partial<Card>) => {
    if (cardData.id) {
      const existingCard = cards.find(c => c.id === cardData.id);
      if (existingCard) {
        updateCard({ 
          ...existingCard, 
          ...cardData, 
          updatedAt: Date.now() 
        } as Card);
      }
    } else {
      const newCard: Card = {
        id: crypto.randomUUID(),
        front: cardData.front || '',
        back: cardData.back || '',
        category: cardData.category,
        frontImage: cardData.frontImage,
        backImage: cardData.backImage,
        frontTranslation: cardData.frontTranslation,
        backTranslation: cardData.backTranslation,
        tags: cardData.tags || [],
        due: Date.now(),
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        repetition: 0,
        interval: 0,
        easiness: 2.5,
        nextReviewDate: Date.now(),
        difficultyScore: 3,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addCard(newCard);
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
    const csvContent = csvUtils.generateCSV(cards);
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

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
        </div>
      );
    }

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
            onCustomStudy={handleCustomStudy}
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
            onTranslateCategory={handleTranslateCategory}
            translatingCategory={translatingCategory}
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
            onUpdateCard={updateCard}
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
      case 'settings':
        return (
          <SettingsView 
            settings={settings}
            onSave={saveSettings}
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
            <h1 className="text-lg font-bold tracking-tight text-white">Snap Recall</h1>
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
            <button 
              onClick={() => setCurrentView('settings')}
              className={`text-sm font-bold transition-colors ${currentView === 'settings' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Settings
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

export default function App() {
  return (
    <ErrorBoundary>
      <SupabaseProvider>
        <StorageProvider>
          <MainApp />
        </StorageProvider>
      </SupabaseProvider>
    </ErrorBoundary>
  );
}
