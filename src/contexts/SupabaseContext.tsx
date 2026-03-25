import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Card, Deck, ReviewLog, UserSettings } from '../models/types';

interface SupabaseContextType {
  user: User | null;
  syncToCloud: (cards: Card[], decks: Deck[], logs: ReviewLog[], settings: UserSettings) => Promise<void>;
  fetchFromCloud: () => Promise<{ cards: Card[]; decks: Deck[]; logs: ReviewLog[]; settings: UserSettings | null }>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncToCloud = async (cards: Card[], decks: Deck[], logs: ReviewLog[], settings: UserSettings) => {
    if (!user) throw new Error('Not signed in');

    // Upsert decks
    if (decks.length > 0) {
      const { error } = await supabase.from('decks').upsert(
        decks.map(d => ({
          id: d.id,
          user_id: user.id,
          name: d.name,
          tags: d.tags,
          created_at: d.createdAt,
        }))
      );
      if (error) throw error;
    }

    // Upsert cards in batches of 100
    for (let i = 0; i < cards.length; i += 100) {
      const batch = cards.slice(i, i + 100);
      const { error } = await supabase.from('cards').upsert(
        batch.map(c => ({
          id: c.id,
          user_id: user.id,
          front: c.front,
          back: c.back,
          back_short: c.backShort ?? null,
          category: c.category ?? null,
          tags: c.tags,
          front_image: c.frontImage ?? null,
          back_image: c.backImage ?? null,
          front_translation: c.frontTranslation ?? null,
          back_translation: c.backTranslation ?? null,
          due: c.due,
          stability: c.stability,
          difficulty: c.difficulty,
          elapsed_days: c.elapsed_days,
          scheduled_days: c.scheduled_days,
          reps: c.reps,
          lapses: c.lapses,
          state: c.state,
          last_review: c.last_review ?? null,
          next_review_date: c.nextReviewDate ?? null,
          difficulty_score: c.difficultyScore ?? null,
          repetition: c.repetition ?? 0,
          interval_days: c.interval ?? 0,
          easiness: c.easiness ?? 2.5,
          created_at: c.createdAt,
          updated_at: c.updatedAt,
        }))
      );
      if (error) throw error;
    }

    // Upsert review logs in batches of 500
    if (logs.length > 0) {
      for (let i = 0; i < logs.length; i += 500) {
        const batch = logs.slice(i, i + 500);
        const { error } = await supabase.from('review_logs').upsert(
          batch.map(l => ({
            id: l.id,
            user_id: user.id,
            card_id: l.cardId,
            quality: l.quality,
            elapsed_days: l.elapsed_days,
            scheduled_days: l.scheduled_days,
            review: l.review,
            state: l.state,
            timestamp: l.timestamp,
          }))
        );
        if (error) throw error;
      }
    }

    // Upsert settings
    const { error: settingsError } = await supabase.from('user_settings').upsert({
      user_id: user.id,
      target_retention: settings.targetRetention,
      auto_translate: settings.autoTranslate ?? false,
      target_language: settings.targetLanguage ?? 'English',
      answer_display_mode: settings.answerDisplayMode ?? 'long',
      updated_at: Date.now(),
    });
    if (settingsError) throw settingsError;
  };

  const fetchFromCloud = async (): Promise<{ cards: Card[]; decks: Deck[]; logs: ReviewLog[]; settings: UserSettings | null }> => {
    if (!user) throw new Error('Not signed in');

    const [decksRes, cardsRes, logsRes, settingsRes] = await Promise.all([
      supabase.from('decks').select('*').eq('user_id', user.id),
      supabase.from('cards').select('*').eq('user_id', user.id),
      supabase.from('review_logs').select('*').eq('user_id', user.id),
      supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
    ]);

    if (decksRes.error) throw decksRes.error;
    if (cardsRes.error) throw cardsRes.error;
    if (logsRes.error) throw logsRes.error;

    const decks: Deck[] = (decksRes.data ?? []).map((d: any) => ({
      id: d.id,
      name: d.name,
      tags: d.tags ?? [],
      createdAt: d.created_at,
    }));

    const cards: Card[] = (cardsRes.data ?? []).map((c: any) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      backShort: c.back_short ?? undefined,
      category: c.category ?? undefined,
      tags: c.tags ?? [],
      frontImage: c.front_image ?? undefined,
      backImage: c.back_image ?? undefined,
      frontTranslation: c.front_translation ?? undefined,
      backTranslation: c.back_translation ?? undefined,
      due: c.due,
      stability: c.stability,
      difficulty: c.difficulty,
      elapsed_days: c.elapsed_days,
      scheduled_days: c.scheduled_days,
      reps: c.reps,
      lapses: c.lapses,
      state: c.state,
      last_review: c.last_review ?? undefined,
      nextReviewDate: c.next_review_date ?? undefined,
      difficultyScore: c.difficulty_score ?? undefined,
      repetition: c.repetition ?? 0,
      interval: c.interval_days ?? 0,
      easiness: c.easiness ?? 2.5,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    const logs: ReviewLog[] = (logsRes.data ?? []).map((l: any) => ({
      id: l.id,
      cardId: l.card_id,
      quality: l.quality,
      elapsed_days: l.elapsed_days,
      scheduled_days: l.scheduled_days,
      review: l.review,
      state: l.state,
      timestamp: l.timestamp,
    }));

    let settings: UserSettings | null = null;
    if (settingsRes.data) {
      const s = settingsRes.data as any;
      settings = {
        targetRetention: s.target_retention,
        autoTranslate: s.auto_translate,
        targetLanguage: s.target_language,
        answerDisplayMode: s.answer_display_mode,
      };
    }

    return { cards, decks, logs, settings };
  };

  return (
    <SupabaseContext.Provider value={{ user, syncToCloud, fetchFromCloud }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
