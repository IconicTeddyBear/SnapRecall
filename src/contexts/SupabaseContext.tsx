import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '@supabase/supabase-js';

export interface Deck {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  user_id: string;
  front_content: string;
  back_content: string;
  difficulty_level: number;
  next_review_date: string;
  created_at: string;
}

interface SupabaseContextType {
  user: User | null;
  decks: Deck[];
  cards: Card[];
  loading: boolean;
  addDeck: (title: string, description?: string) => Promise<Deck | null>;
  addCard: (deck_id: string, front_content: string, back_content: string) => Promise<Card | null>;
  updateCardReview: (card_id: string, difficulty_level: number, next_review_date: string) => Promise<void>;
  deleteCard: (card_id: string) => Promise<void>;
  deleteDeck: (deck_id: string) => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
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

  // Fetch initial data when user logs in
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
        supabase.from('cards').select('*').order('created_at', { ascending: false })
      ]);

      if (decksResponse.data) setDecks(decksResponse.data);
      if (cardsResponse.data) setCards(cardsResponse.data);
      
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Realtime subscription for cards
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:cards')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setCards((prev) => [payload.new as Card, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setCards((prev) => prev.map(c => c.id === payload.new.id ? (payload.new as Card) : c));
        } else if (payload.eventType === 'DELETE') {
          setCards((prev) => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Realtime subscription for decks
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:decks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'decks', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setDecks((prev) => [payload.new as Deck, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setDecks((prev) => prev.map(d => d.id === payload.new.id ? (payload.new as Deck) : d));
        } else if (payload.eventType === 'DELETE') {
          setDecks((prev) => prev.filter(d => d.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Actions
  const addDeck = async (title: string, description?: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('decks')
      .insert([{ user_id: user.id, title, description }])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding deck:', error);
      return null;
    }
    return data;
  };

  const addCard = async (deck_id: string, front_content: string, back_content: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('cards')
      .insert([{ user_id: user.id, deck_id, front_content, back_content }])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding card:', error);
      return null;
    }
    return data;
  };

  const updateCardReview = async (card_id: string, difficulty_level: number, next_review_date: string) => {
    if (!user) return;
    
    // Optimistic update
    setCards(prev => prev.map(c => 
      c.id === card_id 
        ? { ...c, difficulty_level, next_review_date } 
        : c
    ));

    const { error } = await supabase
      .from('cards')
      .update({ difficulty_level, next_review_date })
      .eq('id', card_id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating card review:', error);
      // Rollback logic could go here
    }
  };

  const deleteCard = async (card_id: string) => {
    if (!user) return;
    const { error } = await supabase.from('cards').delete().eq('id', card_id).eq('user_id', user.id);
    if (error) console.error('Error deleting card:', error);
  };

  const deleteDeck = async (deck_id: string) => {
    if (!user) return;
    const { error } = await supabase.from('decks').delete().eq('id', deck_id).eq('user_id', user.id);
    if (error) console.error('Error deleting deck:', error);
  };

  return (
    <SupabaseContext.Provider value={{ user, decks, cards, loading, addDeck, addCard, updateCardReview, deleteCard, deleteDeck }}>
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
