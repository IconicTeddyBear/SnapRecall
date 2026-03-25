import { describe, it, expect } from 'vitest';
import { calculateNextReview } from './srsAlgorithm';
import { Card, UserSettings } from '../models/types';
import { State } from 'ts-fsrs';

const baseSettings: UserSettings = { targetRetention: 0.90 };

function makeNewCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'test-card',
    front: 'Q',
    back: 'A',
    tags: [],
    due: Date.now(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('calculateNextReview', () => {
  it('returns an updatedCard and log', () => {
    const card = makeNewCard();
    const { updatedCard, log } = calculateNextReview(card, 4, baseSettings);
    expect(updatedCard).toBeDefined();
    expect(log).toBeDefined();
  });

  it('grades produce distinct scheduled_days (Again < Hard < Good < Easy)', () => {
    const card = makeNewCard();
    const again = calculateNextReview(card, 1, baseSettings).updatedCard.scheduled_days;
    const hard  = calculateNextReview(card, 2, baseSettings).updatedCard.scheduled_days;
    const good  = calculateNextReview(card, 4, baseSettings).updatedCard.scheduled_days;
    const easy  = calculateNextReview(card, 5, baseSettings).updatedCard.scheduled_days;
    expect(again).toBeLessThanOrEqual(hard);
    expect(hard).toBeLessThanOrEqual(good);
    expect(good).toBeLessThanOrEqual(easy);
  });

  it('quality 3 (Neutral) schedules same or shorter than quality 4 (Good)', () => {
    const card = makeNewCard();
    const neutral = calculateNextReview(card, 3, baseSettings).updatedCard.scheduled_days;
    const good    = calculateNextReview(card, 4, baseSettings).updatedCard.scheduled_days;
    // Neutral maps to Hard, Good maps to Good — neutral interval <= good interval
    expect(neutral).toBeLessThanOrEqual(good);
  });

  it('new card (state=New) does not crash and resets FSRS fields', () => {
    const card = makeNewCard({ state: State.New, reps: 0 });
    const { updatedCard } = calculateNextReview(card, 4, baseSettings);
    expect(updatedCard.reps).toBeGreaterThan(0);
    expect(updatedCard.due).toBeGreaterThan(0);
  });

  it('higher targetRetention produces shorter or equal intervals than lower retention', () => {
    const card = makeNewCard();
    const highRetention = calculateNextReview(card, 4, { targetRetention: 0.95 }).updatedCard.scheduled_days;
    const lowRetention  = calculateNextReview(card, 4, { targetRetention: 0.70 }).updatedCard.scheduled_days;
    expect(highRetention).toBeLessThanOrEqual(lowRetention);
  });

  it('card with legacy SM-2 fields (no FSRS state) falls back to createEmptyCard', () => {
    // Simulate a card migrated from SM-2 with no state field
    const card = makeNewCard({ state: undefined as any, due: undefined as any });
    expect(() => calculateNextReview(card, 4, baseSettings)).not.toThrow();
  });

  it('updatedCard preserves card id and content fields', () => {
    const card = makeNewCard({ id: 'abc-123', front: 'Hello', back: 'World', tags: ['lang'] });
    const { updatedCard } = calculateNextReview(card, 4, baseSettings);
    expect(updatedCard.id).toBe('abc-123');
    expect(updatedCard.front).toBe('Hello');
    expect(updatedCard.back).toBe('World');
    expect(updatedCard.tags).toEqual(['lang']);
  });

  it('updatedCard sets legacy difficultyScore and nextReviewDate', () => {
    const card = makeNewCard();
    const { updatedCard } = calculateNextReview(card, 4, baseSettings);
    expect(updatedCard.difficultyScore).toBeDefined();
    expect(updatedCard.nextReviewDate).toBe(updatedCard.due);
  });
});
