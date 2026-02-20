import { Card, Deck, ReviewLog } from '../models/types';

export const deckUtils = {
  getDueCards: (cards: Card[]): Card[] => {
    const now = Date.now();
    return cards.filter(card => card.nextReviewDate <= now);
  },
  
  getSmartDecks: (cards: Card[], decks: Deck[]) => {
    const now = Date.now();
    return decks.map(deck => {
      const deckCards = cards.filter(card => 
        deck.tags.length === 0 || deck.tags.some(tag => card.tags.includes(tag))
      );
      const dueCount = deckCards.filter(card => card.nextReviewDate <= now).length;
      return {
        ...deck,
        totalCount: deckCards.length,
        dueCount
      };
    });
  },

  getDeckMastery: (cards: Card[]): number => {
    if (cards.length === 0) return 0;
    const totalScore = cards.reduce((acc, card) => {
      if (card.interval >= 21) return acc + 100;
      if (card.interval >= 7) return acc + 80;
      if (card.interval >= 3) return acc + 50;
      if (card.interval > 0) return acc + 20;
      return acc;
    }, 0);
    return Math.round(totalScore / cards.length);
  },

  getSmartStartDeck: (decks: Deck[], cards: Card[]): string | null => {
    if (decks.length === 0) return null;

    const deckStats = decks.map(deck => {
      const deckCards = cards.filter(c => deck.tags.some(t => c.tags.includes(t)));
      const dueCount = deckCards.filter(c => c.nextReviewDate <= Date.now()).length;
      const mastery = deckUtils.getDeckMastery(deckCards);
      return { id: deck.id, dueCount, mastery };
    });

    // Sort by due count (desc), then mastery (asc)
    deckStats.sort((a, b) => {
      if (b.dueCount !== a.dueCount) return b.dueCount - a.dueCount;
      return a.mastery - b.mastery;
    });

    return deckStats[0]?.id || null;
  },

  getWeightedCards: (cards: Card[]): Card[] => {
    const weightedPool: Card[] = [];
    cards.forEach(card => {
      weightedPool.push(card);
      // Difficulty 4 or 5 gets added again (2x frequency)
      if (card.difficultyScore && card.difficultyScore >= 4) {
        weightedPool.push(card);
      }
    });

    // Fisher-Yates Shuffle
    for (let i = weightedPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [weightedPool[i], weightedPool[j]] = [weightedPool[j], weightedPool[i]];
    }

    // Deduplicate while preserving order (first occurrence wins)? 
    // Actually, "appear 2x more frequently" usually means they are in the queue twice.
    // But for a flashcard session, usually you want to see unique cards, 
    // but maybe the user wants to see them twice in one session?
    // "higher difficulty scores should appear 2x more frequently than cards marked 'Easy'"
    // This implies probability of being picked, OR frequency in a queue.
    // If it's a "Study Session" of X cards, we usually pick X unique cards.
    // If we want them to appear *sooner*, we should just sort/weight the pick.
    // If we want them to appear *twice*, we leave duplicates.
    // I'll assume we want unique cards but weighted probability of being picked if we are limiting the session size.
    // BUT, if the session includes ALL due cards, then "frequency" might mean "order" or "repetition".
    // Let's assume for now we just shuffle the due cards. 
    // If the prompt implies "Focus Mode" filters, that's different.
    // "In a regular study session... higher difficulty scores should appear 2x more frequently"
    // This is ambiguous. I will interpret it as: They are twice as likely to be at the front of the queue?
    // OR, if we are picking a subset, they are more likely to be picked.
    // Let's just shuffle the array with duplicates, then deduplicate keeping the first occurrence.
    // This effectively weights them towards the front.
    
    const uniqueCards = new Set<string>();
    const result: Card[] = [];
    for (const card of weightedPool) {
      if (!uniqueCards.has(card.id)) {
        uniqueCards.add(card.id);
        result.push(card);
      }
    }
    return result;
  },

  getStreak: (logs: ReviewLog[]): number => {
    if (logs.length === 0) return 0;

    // Sort logs by timestamp descending
    const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);
    
    // Get unique days reviewed
    const uniqueDays = new Set<string>();
    sortedLogs.forEach(log => {
      uniqueDays.add(new Date(log.timestamp).toDateString());
    });

    const daysArray = Array.from(uniqueDays);
    if (daysArray.length === 0) return 0;

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // If no review today or yesterday, streak is 0
    if (daysArray[0] !== today && daysArray[0] !== yesterday) {
      return 0;
    }

    let streak = 0;
    let currentDate = new Date(daysArray[0]);

    for (let i = 0; i < daysArray.length; i++) {
      const reviewDate = new Date(daysArray[i]);
      const diffTime = Math.abs(currentDate.getTime() - reviewDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        streak++;
        currentDate = reviewDate;
      } else {
        break;
      }
    }

    return streak;
  }
};
