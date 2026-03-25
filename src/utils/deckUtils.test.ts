import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { deckUtils } from './deckUtils';
import { Card, Deck, ReviewLog } from '../models/types';

const NOW = 1_700_000_000_000; // fixed timestamp for determinism

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: crypto.randomUUID(),
    front: 'Q',
    back: 'A',
    tags: [],
    due: NOW - 1000, // due in the past by default
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeLog(timestamp: number, quality = 4): ReviewLog {
  return {
    id: crypto.randomUUID(),
    cardId: 'x',
    quality,
    elapsed_days: 1,
    scheduled_days: 1,
    review: timestamp,
    state: 2,
    timestamp,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── getDueCards ──────────────────────────────────────────────────────────────
describe('getDueCards', () => {
  it('returns cards whose due timestamp is in the past', () => {
    const due = makeCard({ due: NOW - 1 });
    const future = makeCard({ due: NOW + 100_000 });
    expect(deckUtils.getDueCards([due, future])).toContain(due);
    expect(deckUtils.getDueCards([due, future])).not.toContain(future);
  });

  it('returns empty array for empty input', () => {
    expect(deckUtils.getDueCards([])).toEqual([]);
  });

  it('card due exactly at NOW is considered due', () => {
    const card = makeCard({ due: NOW });
    expect(deckUtils.getDueCards([card])).toContain(card);
  });

  it('falls back to nextReviewDate when due is 0', () => {
    const card = makeCard({ due: 0, nextReviewDate: NOW - 1 });
    expect(deckUtils.getDueCards([card])).toContain(card);
  });
});

// ─── getDeckMastery ──────────────────────────────────────────────────────────
describe('getDeckMastery', () => {
  it('returns 0 for empty array', () => {
    expect(deckUtils.getDeckMastery([])).toBe(0);
  });

  it('stability >= 21 scores 100 pts per card', () => {
    const cards = [makeCard({ stability: 21 }), makeCard({ stability: 30 })];
    expect(deckUtils.getDeckMastery(cards)).toBe(100);
  });

  it('stability >= 7 scores 80 pts', () => {
    expect(deckUtils.getDeckMastery([makeCard({ stability: 7 })])).toBe(80);
  });

  it('stability >= 3 scores 50 pts', () => {
    expect(deckUtils.getDeckMastery([makeCard({ stability: 3 })])).toBe(50);
  });

  it('stability > 0 but < 3 scores 20 pts', () => {
    expect(deckUtils.getDeckMastery([makeCard({ stability: 1 })])).toBe(20);
  });

  it('stability = 0 scores 0 pts', () => {
    expect(deckUtils.getDeckMastery([makeCard({ stability: 0 })])).toBe(0);
  });

  it('averages across mixed cards', () => {
    const cards = [makeCard({ stability: 21 }), makeCard({ stability: 0 })];
    expect(deckUtils.getDeckMastery(cards)).toBe(50); // (100 + 0) / 2
  });

  it('falls back to legacy interval when stability is undefined', () => {
    const card = makeCard({ stability: undefined as any, interval: 21 });
    expect(deckUtils.getDeckMastery([card])).toBe(100);
  });
});

// ─── getSmartStartDeck ───────────────────────────────────────────────────────
describe('getSmartStartDeck', () => {
  it('returns null for empty decks', () => {
    expect(deckUtils.getSmartStartDeck([], [])).toBeNull();
  });

  it('prefers deck with more due cards', () => {
    const deckA: Deck = { id: 'a', name: 'A', tags: ['a'], createdAt: 0 };
    const deckB: Deck = { id: 'b', name: 'B', tags: ['b'], createdAt: 0 };
    const cards = [
      makeCard({ tags: ['a'], due: NOW - 1 }),
      makeCard({ tags: ['a'], due: NOW - 1 }),
      makeCard({ tags: ['b'], due: NOW - 1 }),
    ];
    expect(deckUtils.getSmartStartDeck([deckA, deckB], cards)).toBe('a');
  });

  it('when due counts are equal, prefers lower mastery deck', () => {
    const deckA: Deck = { id: 'a', name: 'A', tags: ['a'], createdAt: 0 };
    const deckB: Deck = { id: 'b', name: 'B', tags: ['b'], createdAt: 0 };
    // Same due count (1 each), but deck B has much higher mastery
    const cards = [
      makeCard({ tags: ['a'], due: NOW - 1, stability: 0 }),
      makeCard({ tags: ['b'], due: NOW - 1, stability: 30 }),
    ];
    expect(deckUtils.getSmartStartDeck([deckA, deckB], cards)).toBe('a');
  });

  it('returns first deck id when all decks have 0 due cards', () => {
    const deckA: Deck = { id: 'a', name: 'A', tags: ['a'], createdAt: 0 };
    const cards = [makeCard({ tags: ['a'], due: NOW + 99_999_999 })];
    // All have 0 due — returns the first (only) deck
    expect(deckUtils.getSmartStartDeck([deckA], cards)).toBe('a');
  });
});

// ─── getWeightedCards ────────────────────────────────────────────────────────
describe('getWeightedCards', () => {
  it('returns unique cards (no duplicates in output)', () => {
    const cards = Array.from({ length: 10 }, () => makeCard({ difficultyScore: 5 }));
    const result = deckUtils.getWeightedCards(cards);
    const ids = result.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('preserves all input cards in the output', () => {
    const cards = Array.from({ length: 5 }, () => makeCard());
    const result = deckUtils.getWeightedCards(cards);
    expect(result.length).toBe(5);
    const resultIds = new Set(result.map(c => c.id));
    cards.forEach(c => expect(resultIds.has(c.id)).toBe(true));
  });

  it('handles empty input', () => {
    expect(deckUtils.getWeightedCards([])).toEqual([]);
  });
});

// ─── getStreak ───────────────────────────────────────────────────────────────
describe('getStreak', () => {
  it('returns 0 for empty logs', () => {
    expect(deckUtils.getStreak([])).toBe(0);
  });

  it('returns 0 if last review was 2+ days ago', () => {
    const twoDaysAgo = NOW - 2 * 86_400_000 - 1000;
    expect(deckUtils.getStreak([makeLog(twoDaysAgo)])).toBe(0);
  });

  it('returns 1 for a single review today', () => {
    expect(deckUtils.getStreak([makeLog(NOW)])).toBe(1);
  });

  it('returns 1 for a single review yesterday', () => {
    expect(deckUtils.getStreak([makeLog(NOW - 86_400_000)])).toBe(1);
  });

  it('counts consecutive days correctly', () => {
    const logs = [
      makeLog(NOW),                       // today
      makeLog(NOW - 86_400_000),          // yesterday
      makeLog(NOW - 2 * 86_400_000),      // 2 days ago
    ];
    expect(deckUtils.getStreak(logs)).toBe(3);
  });

  it('stops streak at a gap in days', () => {
    const logs = [
      makeLog(NOW),                       // today
      // skip yesterday
      makeLog(NOW - 2 * 86_400_000),      // 2 days ago
    ];
    expect(deckUtils.getStreak(logs)).toBe(1);
  });

  it('counts multiple reviews on same day as one streak day', () => {
    const logs = [
      makeLog(NOW),
      makeLog(NOW - 1000),           // same day, different time
      makeLog(NOW - 86_400_000),     // yesterday
    ];
    expect(deckUtils.getStreak(logs)).toBe(2);
  });
});
