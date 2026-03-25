import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';

// ─── Supabase-side types (match the DB schema after migration 00002) ────────

export interface SupabaseDeck {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tags: string[];
  created_at_ms: number;
  created_at: string;
}

export interface SupabaseCard {
  id: string;
  deck_id: string | null;
  user_id: string;
  // Content
  front_content: string;
  back_content: string;
  back_short: string | null;
  category: string | null;
  tags: string[];
  front_image: string | null;
  back_image: string | null;
  front_translation: string | null;
  back_translation: string | null;
  // FSRS scheduling
  stability: number;
  difficulty_fsrs: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: number | null;
  due: number;
  // Legacy SM-2
  repetition: number;
  interval_days: number;
  easiness: number;
  difficulty_score: number;
  // Timestamps
  created_at_ms: number;
  updated_at: number;
  // Original columns (kept for back-compat with migration 00001)
  difficulty_level: number;
  next_review_date: string;
  created_at: string;
}

export interface SupabaseReviewLog {
  id: string;
  user_id: string;
  card_id: string;
  quality: number;
  elapsed_days: number;
  scheduled_days: number;
  review: number;
  state: number;
  timestamp: number;
}

// ─── Context type ───────────────────────────────────────────────────────────

interface SupabaseContextType {
  user: User | null;
  decks: SupabaseDeck[];
  cards: SupabaseCard[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<SupabaseDeck[]>([]);
  const [cards, setCards] = useState<SupabaseCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch decks + cards whenever the signed-in user changes
  useEffect(() => {
    if (!user) {
      setDecks([]);
      setCards([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const [decksResponse, cardsResponse] = await Promise.all([
        supabase.from('decks').select('*').order('created_at', { ascending: false }),
        supabase.from('cards').select('*').order('created_at', { ascending: false }),
      ]);

      if (decksResponse.data) setDecks(decksResponse.data as SupabaseDeck[]);
      if (cardsResponse.data) setCards(cardsResponse.data as SupabaseCard[]);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Realtime: cards
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime:cards')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCards((prev) => [payload.new as SupabaseCard, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setCards((prev) => prev.map(c => c.id === payload.new.id ? (payload.new as SupabaseCard) : c));
          } else if (payload.eventType === 'DELETE') {
            setCards((prev) => prev.filter(c => c.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Realtime: decks
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime:decks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'decks', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDecks((prev) => [payload.new as SupabaseDeck, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDecks((prev) => prev.map(d => d.id === payload.new.id ? (payload.new as SupabaseDeck) : d));
          } else if (payload.eventType === 'DELETE') {
            setDecks((prev) => prev.filter(d => d.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SupabaseContext.Provider value={{ user, decks, cards, loading, signOut }}>
      {children}
    </SupabaseContext.Provider>
  );
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
