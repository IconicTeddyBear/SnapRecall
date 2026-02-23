import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Card, Deck, ReviewLog } from '../models/types';

interface FlashcardsDB extends DBSchema {
  cards: {
    key: string;
    value: Card;
    indexes: { 'by-next-review': number; 'by-category': string };
  };
  decks: {
    key: string;
    value: Deck;
  };
  logs: {
    key: string;
    value: ReviewLog;
    indexes: { 'by-timestamp': number; 'by-card': string };
  };
  daily_stats: {
    key: string;
    value: { date: string; count: number; qualitySum: number };
  };
  meta: {
    key: string;
    value: { version: number; lastRotation: number };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'flashcards-db';
const DB_VERSION = 3;

export class DatabaseService {
  private dbPromise: Promise<IDBPDatabase<FlashcardsDB>>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private async initDB() {
    return openDB<FlashcardsDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (oldVersion < 1) {
          const cardStore = db.createObjectStore('cards', { keyPath: 'id' });
          cardStore.createIndex('by-next-review', 'nextReviewDate');
          cardStore.createIndex('by-category', 'category');

          db.createObjectStore('decks', { keyPath: 'id' });
          
          const logStore = db.createObjectStore('logs', { keyPath: 'id' });
          logStore.createIndex('by-timestamp', 'timestamp');
          logStore.createIndex('by-card', 'cardId');

          db.createObjectStore('meta', { keyPath: 'key' });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('daily_stats')) {
            db.createObjectStore('daily_stats', { keyPath: 'date' });
          }
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
          }
        }
      },
    });
  }

  async migrateFromLocalStorage() {
    const db = await this.dbPromise;
    const tx = db.transaction(['cards', 'decks', 'logs'], 'readwrite');
    
    const localCards = localStorage.getItem('flashcards_cards');
    const localDecks = localStorage.getItem('flashcards_decks');
    const localLogs = localStorage.getItem('flashcards_logs');

    let migrated = false;

    if (localCards) {
      try {
        const cards: Card[] = JSON.parse(localCards);
        if (cards.length > 0) {
          const count = await tx.objectStore('cards').count();
          if (count === 0) {
            for (const card of cards) {
              await tx.objectStore('cards').put(card);
            }
            migrated = true;
          }
        }
      } catch (e) {
        console.error('Failed to migrate cards:', e);
      }
    }

    if (localDecks) {
      try {
        const decks: Deck[] = JSON.parse(localDecks);
        if (decks.length > 0) {
          const count = await tx.objectStore('decks').count();
          if (count === 0) {
            for (const deck of decks) {
              await tx.objectStore('decks').put(deck);
            }
            migrated = true;
          }
        }
      } catch (e) {
        console.error('Failed to migrate decks:', e);
      }
    }

    if (localLogs) {
      try {
        const logs: ReviewLog[] = JSON.parse(localLogs);
        if (logs.length > 0) {
          const count = await tx.objectStore('logs').count();
          if (count === 0) {
            for (const log of logs) {
              await tx.objectStore('logs').put(log);
            }
            migrated = true;
          }
        }
      } catch (e) {
        console.error('Failed to migrate logs:', e);
      }
    }

    await tx.done;
    return migrated;
  }

  async getCards(): Promise<Card[]> {
    const db = await this.dbPromise;
    return db.getAll('cards');
  }

  async saveCard(card: Card) {
    const db = await this.dbPromise;
    return db.put('cards', card);
  }

  async deleteCard(id: string) {
    const db = await this.dbPromise;
    return db.delete('cards', id);
  }

  async getDecks(): Promise<Deck[]> {
    const db = await this.dbPromise;
    return db.getAll('decks');
  }

  async saveDeck(deck: Deck) {
    const db = await this.dbPromise;
    return db.put('decks', deck);
  }

  async getLogs(): Promise<ReviewLog[]> {
    const db = await this.dbPromise;
    return db.getAll('logs');
  }

  async addLog(log: ReviewLog) {
    const db = await this.dbPromise;
    return db.put('logs', log);
  }

  async rotateLogs() {
    const db = await this.dbPromise;
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    
    // Check if we need to rotate (e.g., once a day)
    const meta = await db.get('meta', 'lastRotation');
    // If we rotated less than 24 hours ago, skip
    if (meta && meta.lastRotation && (Date.now() - meta.lastRotation < 24 * 60 * 60 * 1000)) {
      return;
    }

    const tx = db.transaction(['logs', 'daily_stats', 'meta'], 'readwrite');
    const logStore = tx.objectStore('logs');
    const statsStore = tx.objectStore('daily_stats');
    const index = logStore.index('by-timestamp');
    
    // Get logs older than 90 days
    const oldLogs = await index.getAll(IDBKeyRange.upperBound(ninetyDaysAgo));

    if (oldLogs.length > 0) {
      const statsMap = new Map<string, { count: number; qualitySum: number }>();

      for (const log of oldLogs) {
        const date = new Date(log.timestamp).toISOString().split('T')[0];
        const current = statsMap.get(date) || { count: 0, qualitySum: 0 };
        statsMap.set(date, {
          count: current.count + 1,
          qualitySum: current.qualitySum + log.quality
        });
        
        // Delete the individual log
        await logStore.delete(log.id);
      }

      // Save aggregated stats
      for (const [date, stat] of statsMap.entries()) {
        const existing = await statsStore.get(date);
        if (existing) {
          await statsStore.put({
            date,
            count: existing.count + stat.count,
            qualitySum: existing.qualitySum + stat.qualitySum
          });
        } else {
          await statsStore.put({
            date,
            count: stat.count,
            qualitySum: stat.qualitySum
          });
        }
      }
    }
    
    await tx.objectStore('meta').put({ key: 'lastRotation', value: { version: DB_VERSION, lastRotation: Date.now() } });
    await tx.done;
  }

  async getStorageUsage(): Promise<{ usage: number; quota: number } | null> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return null;
  }

  async getSettings(): Promise<any> {
    const db = await this.dbPromise;
    const settings = await db.get('settings', 'user');
    return settings?.value || { targetRetention: 0.90 };
  }

  async saveSettings(settings: any) {
    const db = await this.dbPromise;
    return db.put('settings', { key: 'user', value: settings });
  }
}

export const dbService = new DatabaseService();
