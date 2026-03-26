export interface Card {
  id: string;
  front: string;
  back: string;
  backShort?: string;
  frontImage?: string; // base64 or URL
  backImage?: string; // base64 or URL
  frontTranslation?: string;
  backTranslation?: string;
  category?: string;
  tags: string[];
  
  // FSRS Data
  due: number; // timestamp
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: number; // timestamp

  // Legacy SM-2 (kept for migration)
  repetition?: number;
  interval?: number;
  easiness?: number;
  nextReviewDate?: number;
  difficultyScore?: number;

  createdAt: number;
  updatedAt: number;
}

export interface Deck {
  id: string;
  name: string;
  tags: string[]; // Smart deck criteria
  createdAt: number;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  quality: number; // FSRS Rating (1=Again, 2=Hard, 3=Good, 4=Easy)
  elapsed_days: number;
  scheduled_days: number;
  review: number; // timestamp
  state: number;
  timestamp: number;
}

export interface UserSettings {
  targetRetention: number; // e.g. 0.90 for 90%
  autoTranslate?: boolean;
  targetLanguage?: string;
  answerDisplayMode?: 'short' | 'long' | 'both';
  uiLanguage?: 'en' | 'de';
}
