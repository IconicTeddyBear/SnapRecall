import { Card, Deck } from '../models/types';

const STORAGE_KEY_CARDS = 'flashcards_cards';
const STORAGE_KEY_DECKS = 'flashcards_decks';
const STORAGE_KEY_LOGS = 'flashcards_logs';

export const storageManager = {
  getCards: (): Card[] => {
    const data = localStorage.getItem(STORAGE_KEY_CARDS);
    return data ? JSON.parse(data) : [];
  },
  saveCards: (cards: Card[]) => {
    localStorage.setItem(STORAGE_KEY_CARDS, JSON.stringify(cards));
  },
  getDecks: (): Deck[] => {
    const data = localStorage.getItem(STORAGE_KEY_DECKS);
    return data ? JSON.parse(data) : [];
  },
  saveDecks: (decks: Deck[]) => {
    localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
  },
  getLogs: (): any[] => {
    const data = localStorage.getItem(STORAGE_KEY_LOGS);
    return data ? JSON.parse(data) : [];
  },
  saveLogs: (logs: any[]) => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  },
};
