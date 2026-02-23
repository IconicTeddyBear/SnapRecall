import { Card, Deck, ReviewLog } from '../models/types';

const STORAGE_KEY_CARDS = 'flashcards_cards';
const STORAGE_KEY_DECKS = 'flashcards_decks';
const STORAGE_KEY_LOGS = 'flashcards_logs';

function safeParse<T>(data: string | null, fallback: T[]): T[] {
  if (!data) return fallback;
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export const storageManager = {
  getCards: (): Card[] => {
    return safeParse<Card>(localStorage.getItem(STORAGE_KEY_CARDS), []);
  },
  saveCards: (cards: Card[]) => {
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  },
  getDecks: (): Deck[] => {
    return safeParse<Deck>(localStorage.getItem(STORAGE_KEY_DECKS), []);
  },
  saveDecks: (decks: Deck[]) => {
    localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
  },
  getLogs: (): ReviewLog[] => {
    return safeParse<ReviewLog>(localStorage.getItem(STORAGE_KEY_LOGS), []);
  },
  saveLogs: (logs: ReviewLog[]) => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  },
};
