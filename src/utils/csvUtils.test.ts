import { describe, it, expect } from 'vitest';
import { csvUtils } from './csvUtils';
import { Card } from '../models/types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    front: 'What is 2+2?',
    back: '4',
    tags: ['math'],
    due: 0,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

// ─── generateCSV ─────────────────────────────────────────────────────────────
describe('generateCSV', () => {
  it('produces a header row', () => {
    const csv = csvUtils.generateCSV([]);
    expect(csv.startsWith('id,front,back')).toBe(true);
  });

  it('handles empty card list (header only)', () => {
    const csv = csvUtils.generateCSV([]);
    const lines = csv.trim().split('\n');
    expect(lines.length).toBe(1);
  });

  it('escapes double-quotes in fields', () => {
    const card = makeCard({ front: 'He said "hello"' });
    const csv = csvUtils.generateCSV([card]);
    expect(csv).toContain('He said ""hello""');
  });

  it('uses semicolons for tag separators (not commas)', () => {
    const card = makeCard({ tags: ['alpha', 'beta'] });
    const csv = csvUtils.generateCSV([card]);
    // tags column should contain alpha;beta, not alpha,beta
    expect(csv).toContain('alpha;beta');
    expect(csv).not.toContain('"alpha,beta"');
  });
});

// ─── parseCSV ─────────────────────────────────────────────────────────────────
describe('parseCSV', () => {
  it('throws when front or back column is missing', () => {
    expect(() => csvUtils.parseCSV('id,question\n1,foo')).toThrow(/front.*back|back.*front/i);
  });

  it('returns empty array for header-only CSV', () => {
    expect(csvUtils.parseCSV('front,back')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(csvUtils.parseCSV('')).toEqual([]);
  });

  it('parses a simple row', () => {
    const result = csvUtils.parseCSV('front,back\nHello,World');
    expect(result).toHaveLength(1);
    expect(result[0].front).toBe('Hello');
    expect(result[0].back).toBe('World');
  });

  it('handles Windows line endings (\\r\\n)', () => {
    const result = csvUtils.parseCSV('front,back\r\nHello\r\nWorld,Answer');
    // Only the last valid row (World,Answer) should parse; "Hello" with no back is still parsed
    expect(result.length).toBeGreaterThan(0);
  });

  it('parses quoted fields with internal commas', () => {
    const result = csvUtils.parseCSV('front,back\n"Hello, World","The answer, yes"');
    expect(result[0].front).toBe('Hello, World');
    expect(result[0].back).toBe('The answer, yes');
  });

  it('parses escaped double-quotes inside fields', () => {
    const result = csvUtils.parseCSV('front,back\n"He said ""hi""","fine"');
    expect(result[0].front).toBe('He said "hi"');
  });

  it('splits tags by semicolons', () => {
    const result = csvUtils.parseCSV('front,back,tags\nQ,A,"alpha;beta;gamma"');
    expect(result[0].tags).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('skips blank lines', () => {
    const result = csvUtils.parseCSV('front,back\nQ,A\n\nQ2,A2');
    expect(result).toHaveLength(2);
  });

  it('handles missing optional columns gracefully', () => {
    const result = csvUtils.parseCSV('front,back\nQ,A');
    expect(result[0].backShort).toBeUndefined();
    expect(result[0].category).toBeUndefined();
    expect(result[0].tags).toEqual([]);
  });
});

// ─── Round-trip fidelity ──────────────────────────────────────────────────────
describe('round-trip (generate → parse)', () => {
  it('preserves front/back content', () => {
    const card = makeCard({ front: 'Original question', back: 'Original answer' });
    const csv = csvUtils.generateCSV([card]);
    const [parsed] = csvUtils.parseCSV(csv);
    expect(parsed.front).toBe(card.front);
    expect(parsed.back).toBe(card.back);
  });

  it('preserves tags', () => {
    const card = makeCard({ tags: ['science', 'biology'] });
    const csv = csvUtils.generateCSV([card]);
    const [parsed] = csvUtils.parseCSV(csv);
    expect(parsed.tags).toEqual(card.tags);
  });

  it('preserves fields with embedded quotes and commas', () => {
    const card = makeCard({
      front: 'Define "entropy", please',
      back: 'A measure of disorder, chaos, etc.',
    });
    const csv = csvUtils.generateCSV([card]);
    const [parsed] = csvUtils.parseCSV(csv);
    expect(parsed.front).toBe(card.front);
    expect(parsed.back).toBe(card.back);
  });

  it('preserves optional fields (backShort, category)', () => {
    const card = makeCard({ backShort: 'Short', category: 'Chemistry' });
    const csv = csvUtils.generateCSV([card]);
    const [parsed] = csvUtils.parseCSV(csv);
    expect(parsed.backShort).toBe('Short');
    expect(parsed.category).toBe('Chemistry');
  });

  it('round-trips multiple cards', () => {
    const cards = [
      makeCard({ id: '1', front: 'Q1', back: 'A1', tags: ['a'] }),
      makeCard({ id: '2', front: 'Q2', back: 'A2', tags: ['b', 'c'] }),
    ];
    const csv = csvUtils.generateCSV(cards);
    const parsed = csvUtils.parseCSV(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].front).toBe('Q1');
    expect(parsed[1].front).toBe('Q2');
    expect(parsed[1].tags).toEqual(['b', 'c']);
  });
});
