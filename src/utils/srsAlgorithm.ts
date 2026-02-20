import { Card } from '../models/types';

// Quality: 0-5
// 0: Complete blackout
// 1: Incorrect, but remembered upon seeing answer
// 2: Incorrect, but seemed easy to recall
// 3: Correct, but required significant effort
// 4: Correct, after a hesitation
// 5: Perfect response

export function calculateNextReview(card: Card, quality: number): Card {
  let { repetition, interval, easiness } = card;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easiness);
    }
    repetition += 1;
  } else {
    repetition = 0;
    interval = 1;
  }

  easiness = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easiness < 1.3) easiness = 1.3;

  const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

  // Update difficulty score (1-5)
  // Hard (1) -> 5 (Very Hard)
  // Good (3) -> 3 (Medium)
  // Easy (5) -> 1 (Very Easy)
  let difficultyScore = card.difficultyScore || 3;
  if (quality <= 2) difficultyScore = 5;
  else if (quality === 3) difficultyScore = 3;
  else if (quality >= 4) difficultyScore = 1;

  return {
    ...card,
    repetition,
    interval,
    easiness,
    nextReviewDate,
    difficultyScore,
    updatedAt: Date.now(),
  };
}
