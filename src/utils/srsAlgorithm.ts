import { Card, UserSettings } from '../models/types';
import { FSRS, createEmptyCard, generatorParameters, Rating, Card as FSRSCard, State } from 'ts-fsrs';

export function calculateNextReview(card: Card, quality: number, settings: UserSettings): { updatedCard: Card, log: any } {
  const params = generatorParameters({ request_retention: settings.targetRetention || 0.90 });
  const fsrs = new FSRS(params);

  // Map quality (1-4) to FSRS Rating
  // Assuming input quality is: 1=Again, 2=Hard, 3=Good, 4=Easy
  let rating = Rating.Good;
  if (quality === 1) rating = Rating.Again;
  else if (quality === 2) rating = Rating.Hard;
  else if (quality === 3) rating = Rating.Good;
  else if (quality === 4) rating = Rating.Easy;

  // Reconstruct FSRS card from our Card model
  let fsrsCard: FSRSCard;
  if (card.due === undefined || card.state === undefined) {
    // This is a new card or legacy SM-2 card
    fsrsCard = createEmptyCard(new Date());
  } else {
    fsrsCard = {
      due: new Date(card.due),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state as State,
      last_review: card.last_review ? new Date(card.last_review) : undefined,
    } as FSRSCard;
  }

  const now = new Date();
  const schedulingInfo = fsrs.repeat(fsrsCard, now);
  const result = schedulingInfo[rating];

  const updatedFSRSCard = result.card;
  const log = result.log;

  const updatedCard: Card = {
    ...card,
    due: updatedFSRSCard.due.getTime(),
    stability: updatedFSRSCard.stability,
    difficulty: updatedFSRSCard.difficulty,
    elapsed_days: updatedFSRSCard.elapsed_days,
    scheduled_days: updatedFSRSCard.scheduled_days,
    reps: updatedFSRSCard.reps,
    lapses: updatedFSRSCard.lapses,
    state: updatedFSRSCard.state,
    last_review: updatedFSRSCard.last_review?.getTime(),
    updatedAt: now.getTime(),
    
    // Maintain legacy fields for compatibility if needed
    difficultyScore: updatedFSRSCard.difficulty > 7 ? 5 : updatedFSRSCard.difficulty > 4 ? 3 : 1,
    nextReviewDate: updatedFSRSCard.due.getTime(),
  };

  return { updatedCard, log };
}
