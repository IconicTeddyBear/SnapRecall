import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Card, Deck, ReviewLog, UserSettings } from '../models/types';
import { dbService } from '../services/db';

interface StorageContextType {
  cards: Card[];
  decks: Deck[];
  logs: ReviewLog[];
  settings: UserSettings;
  loading: boolean;
  storageUsage: { usage: number; quota: number } | null;
  addCard: (card: Card) => Promise<void>;
  updateCard: (card: Card) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  saveDeck: (deck: Deck) => Promise<void>;
  saveDecks: (decks: Deck[]) => Promise<void>;
  addLog: (log: ReviewLog) => Promise<void>;
  importCards: (cards: Partial<Card>[]) => Promise<void>;
  saveSettings: (settings: UserSettings) => Promise<void>;
  refreshData: () => Promise<void>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ targetRetention: 0.90 });
  const [loading, setLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);

  const refreshData = async () => {
    try {
      const [loadedCards, loadedDecks, loadedLogs, loadedSettings] = await Promise.all([
        dbService.getCards(),
        dbService.getDecks(),
        dbService.getLogs(),
        dbService.getSettings()
      ]);
      setCards(loadedCards);
      setDecks(loadedDecks);
      setLogs(loadedLogs);
      setSettings(loadedSettings);
      
      const usage = await dbService.getStorageUsage();
      setStorageUsage(usage);
      
      if (usage && usage.quota > 0 && (usage.usage / usage.quota) > 0.8) {
        console.warn('Storage usage is over 80%');
        // In a real app, we might show a toast here
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await dbService.migrateFromLocalStorage();
        await dbService.rotateLogs();
        
        // Check if we need default deck
        const existingDecks = await dbService.getDecks();
        if (existingDecks.length === 0) {
          const defaultDeck: Deck = {
            id: 'default',
            name: 'All Cards',
            tags: [],
            createdAt: Date.now()
          };
          await dbService.saveDeck(defaultDeck);
        }

        await refreshData();
      } catch (error) {
        console.error('Failed to initialize storage:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const ensureDecksForTags = async (tags: string[]) => {
    const currentDecks = await dbService.getDecks();
    const existingTagDecks = new Set(currentDecks.map(d => d.name.toLowerCase()));
    let decksUpdated = false;

    for (const tag of tags) {
      const tagName = tag.charAt(0).toUpperCase() + tag.slice(1);
      if (!existingTagDecks.has(tagName.toLowerCase())) {
        const newDeck: Deck = {
          id: crypto.randomUUID(),
          name: tagName,
          tags: [tag.toLowerCase()],
          createdAt: Date.now()
        };
        await dbService.saveDeck(newDeck);
        existingTagDecks.add(tagName.toLowerCase());
        decksUpdated = true;
      }
    }
    return decksUpdated;
  };

  const addCard = async (card: Card) => {
    await dbService.saveCard(card);
    const decksUpdated = await ensureDecksForTags(card.tags);
    setCards(prev => [...prev, card]);
    if (decksUpdated) {
      const loadedDecks = await dbService.getDecks();
      setDecks(loadedDecks);
    }
  };

  const updateCard = async (card: Card) => {
    await dbService.saveCard(card);
    const decksUpdated = await ensureDecksForTags(card.tags);
    setCards(prev => prev.map(c => c.id === card.id ? card : c));
    if (decksUpdated) {
      const loadedDecks = await dbService.getDecks();
      setDecks(loadedDecks);
    }
  };

  const deleteCard = async (id: string) => {
    await dbService.deleteCard(id);
    setCards(prev => prev.filter(c => c.id !== id));
  };

  const saveDeck = async (deck: Deck) => {
    await dbService.saveDeck(deck);
    setDecks(prev => {
      const idx = prev.findIndex(d => d.id === deck.id);
      if (idx !== -1) {
        const newDecks = [...prev];
        newDecks[idx] = deck;
        return newDecks;
      }
      return [...prev, deck];
    });
  };

  const saveDecks = async (decksToSave: Deck[]) => {
    for (const deck of decksToSave) {
      await dbService.saveDeck(deck);
    }
    const loadedDecks = await dbService.getDecks();
    setDecks(loadedDecks);
  };

  const addLog = async (log: ReviewLog) => {
    await dbService.addLog(log);
    setLogs(prev => [...prev, log]);
  };

  const importCards = async (importedCards: Partial<Card>[]) => {
    const now = Date.now();
    const allTags = new Set<string>();
    
    for (const data of importedCards) {
      const newCard: Card = {
        id: data.id || crypto.randomUUID(),
        front: data.front || '',
        back: data.back || '',
        backShort: data.backShort,
        category: data.category,
        tags: data.tags || [],
        frontImage: data.frontImage,
        backImage: data.backImage,
        frontTranslation: data.frontTranslation,
        backTranslation: data.backTranslation,
        due: data.due || now,
        stability: data.stability || 0,
        difficulty: data.difficulty || 0,
        elapsed_days: data.elapsed_days || 0,
        scheduled_days: data.scheduled_days || 0,
        reps: data.reps || 0,
        lapses: data.lapses || 0,
        state: data.state || 0,
        repetition: data.repetition || 0,
        interval: data.interval || 0,
        easiness: data.easiness || 2.5,
        nextReviewDate: data.nextReviewDate || now,
        difficultyScore: data.difficultyScore || 3,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,
      };
      
      await dbService.saveCard(newCard);
      newCard.tags.forEach(t => allTags.add(t));
    }
    
    await ensureDecksForTags(Array.from(allTags));
    await refreshData();
  };

  const saveSettings = async (newSettings: UserSettings) => {
    await dbService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  return (
    <StorageContext.Provider value={{
      cards,
      decks,
      logs,
      settings,
      loading,
      storageUsage,
      addCard,
      updateCard,
      deleteCard,
      saveDeck,
      saveDecks,
      addLog,
      importCards,
      saveSettings,
      refreshData
    }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
