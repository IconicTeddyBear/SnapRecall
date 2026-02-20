export interface Card {
  id: string;
  front: string;
  back: string;
  frontImage?: string; // base64 or URL
  backImage?: string; // base64 or URL
  category?: string;
  tags: string[];
  // SRS Data (SuperMemo-2 style)
  repetition: number;
  interval: number;
  easiness: number;
  nextReviewDate: number; // timestamp
  difficultyScore: number; // 1-5, higher is harder
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
  quality: number;
  easiness: number;
  interval: number;
  timestamp: number;
}
