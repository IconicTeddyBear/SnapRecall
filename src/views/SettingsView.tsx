import React, { useState } from 'react';
import { UserSettings } from '../models/types';
import { Save, Cloud, Download, Loader2 } from 'lucide-react';
import { useStorage } from '../contexts/StorageContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { AuthUI } from '../components/AuthUI';
import { supabase } from '../services/supabaseClient';

interface SettingsViewProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave }) => {
  const [targetRetention, setTargetRetention] = useState((settings.targetRetention * 100).toString());
  const [autoTranslate, setAutoTranslate] = useState(settings.autoTranslate || false);
  const [targetLanguage, setTargetLanguage] = useState(settings.targetLanguage || 'English');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const { cards, decks, logs, importCards, saveDecks } = useStorage();
  const { user, decks: supabaseDecks, cards: supabaseCards } = useSupabase();

  const handleSyncToCloud = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // 1. Push Decks
      for (const deck of decks) {
        const { error } = await supabase.from('decks').upsert({
          id: deck.id,
          user_id: user.id,
          title: deck.name,
          description: deck.tags.join(', '),
          created_at: new Date(deck.createdAt).toISOString(),
        });
        if (error) throw error;
      }

      // 2. Push Cards
      for (const card of cards) {
        // Find a matching deck or use default
        const deck = decks.find(d => d.name === card.category) || decks[0];
        const deck_id = deck ? deck.id : 'default';

        const { error } = await supabase.from('cards').upsert({
          id: card.id,
          deck_id,
          user_id: user.id,
          front_content: card.front,
          back_content: card.back,
          difficulty_level: card.difficultyScore || 3,
          next_review_date: new Date(card.nextReviewDate || Date.now()).toISOString(),
          created_at: new Date(card.createdAt).toISOString(),
        });
        if (error) throw error;
      }

      alert('Data successfully synced to Supabase!');
    } catch (error: unknown) {
      console.error(error);
      alert('Failed to sync data to cloud: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFetchFromCloud = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      if (supabaseDecks.length > 0) {
        const mappedDecks = supabaseDecks.map(d => ({
          id: d.id,
          name: d.title,
          tags: d.description ? d.description.split(',').map(t => t.trim()) : [],
          createdAt: new Date(d.created_at).getTime()
        }));
        await saveDecks(mappedDecks);
      }

      if (supabaseCards.length > 0) {
        const mappedCards = supabaseCards.map(c => {
          const deck = supabaseDecks.find(d => d.id === c.deck_id);
          return {
            id: c.id,
            front: c.front_content,
            back: c.back_content,
            category: deck ? deck.title : 'Uncategorized',
            tags: [],
            due: new Date(c.next_review_date).getTime(),
            nextReviewDate: new Date(c.next_review_date).getTime(),
            difficultyScore: c.difficulty_level,
            createdAt: new Date(c.created_at).getTime(),
            updatedAt: new Date(c.created_at).getTime(),
            stability: 0,
            difficulty: 0,
            elapsed_days: 0,
            scheduled_days: 0,
            reps: 0,
            lapses: 0,
            state: 0,
            repetition: 0,
            interval: 0,
            easiness: 2.5,
          };
        });
        await importCards(mappedCards);
        alert('Data successfully fetched from Supabase!');
      } else {
        alert('No cards found in cloud.');
      }
    } catch (error: unknown) {
      console.error(error);
      alert('Failed to fetch data from cloud: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const retention = parseFloat(targetRetention) / 100;
    if (retention >= 0.7 && retention <= 0.99) {
      onSave({ 
        ...settings, 
        targetRetention: retention,
        autoTranslate,
        targetLanguage
      });
      alert('Settings saved successfully!');
    } else {
      alert('Retention rate must be between 70% and 99%');
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-slate-400 text-sm">Configure your flashcard experience.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-200">
            Target Retention Rate (%)
          </label>
          <p className="text-xs text-slate-400 mb-2">
            The FSRS algorithm will adjust intervals to ensure you remember this percentage of cards. 
            Higher retention means more frequent reviews. Recommended: 85% - 95%.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min="70"
              max="99"
              step="1"
              value={targetRetention}
              onChange={(e) => setTargetRetention(e.target.value)}
              className="w-32 p-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all font-medium text-white"
              required
            />
            <span className="text-slate-400 font-medium">%</span>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-700 space-y-4">
          <h3 className="text-lg font-bold text-white">AI Translation</h3>
          
          <div className="space-y-2 pt-2">
            <label className="text-sm font-bold text-slate-200">
              Target Language
            </label>
            <p className="text-xs text-slate-400 mb-2">
              The language to translate your cards into when using the Translate feature in the Library.
            </p>
            <input
              type="text"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              placeholder="e.g. English, Spanish, French"
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all font-medium text-white"
              required
            />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-700 space-y-4">
          <h3 className="text-lg font-bold text-white">Cloud Sync (Supabase)</h3>
          
          {!user ? (
            <div className="mt-4">
              <AuthUI />
            </div>
          ) : (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 font-bold">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Signed In</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="text-slate-400 hover:text-rose-400 transition-colors p-2 text-sm font-bold"
                >
                  Sign Out
                </button>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSyncToCloud}
                  disabled={isSyncing}
                  className="flex-1 bg-violet-600/20 text-violet-400 px-4 py-2 rounded-xl font-bold hover:bg-violet-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
                  Upload to Cloud
                </button>
                <button
                  type="button"
                  onClick={handleFetchFromCloud}
                  disabled={isSyncing}
                  className="flex-1 bg-emerald-600/20 text-emerald-400 px-4 py-2 rounded-xl font-bold hover:bg-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  Download from Cloud
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-700">
          <button
            type="submit"
            className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-500 transition-all flex items-center gap-2 shadow-lg shadow-violet-500/20 active:scale-[0.98]"
          >
            <Save size={18} />
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
