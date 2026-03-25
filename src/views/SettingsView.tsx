import React, { useState } from 'react';
import { UserSettings } from '../models/types';
import { Save, Cloud, Download, Loader2 } from 'lucide-react';
import { useStorage } from '../contexts/StorageContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { AuthUI } from '../components/AuthUI';
import { supabase } from '../services/supabaseClient';
import type { SupabaseCard, SupabaseDeck } from '../contexts/SupabaseContext';

interface SettingsViewProps {
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSave }) => {
  const [targetRetention, setTargetRetention] = useState((settings.targetRetention * 100).toString());
  const [autoTranslate, setAutoTranslate] = useState(settings.autoTranslate || false);
  const [targetLanguage, setTargetLanguage] = useState(settings.targetLanguage || 'English');
  const [answerDisplayMode, setAnswerDisplayMode] = useState<'short' | 'long' | 'both'>(settings.answerDisplayMode || 'long');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const { cards, decks, logs, importCards, saveDecks } = useStorage();
  const { user, decks: supabaseDecks, cards: supabaseCards, signOut } = useSupabase();

  const handleSyncToCloud = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // 1. Push decks (skip the virtual 'default' deck — its id is not a UUID)
      const syncableDecks = decks.filter(d => d.id !== 'default');
      for (const deck of syncableDecks) {
        const row = {
          id: deck.id,
          user_id: user.id,
          title: deck.name,
          description: deck.tags.join(', ') || null,
          tags: deck.tags,
          created_at_ms: deck.createdAt,
          created_at: new Date(deck.createdAt).toISOString(),
        };
        const { error } = await supabase.from('decks').upsert(row);
        if (error) throw error;
      }

      // 2. Push cards with full FSRS data
      for (const card of cards) {
        const row: Omit<SupabaseCard, 'next_review_date'> & { next_review_date: string } = {
          id: card.id,
          user_id: user.id,
          deck_id: null,
          // Content
          front_content: card.front,
          back_content: card.back,
          back_short: card.backShort ?? null,
          category: card.category ?? null,
          tags: card.tags,
          front_image: card.frontImage ?? null,
          back_image: card.backImage ?? null,
          front_translation: card.frontTranslation ?? null,
          back_translation: card.backTranslation ?? null,
          // FSRS
          stability: card.stability,
          difficulty_fsrs: card.difficulty,
          elapsed_days: card.elapsed_days,
          scheduled_days: card.scheduled_days,
          reps: card.reps,
          lapses: card.lapses,
          state: card.state,
          last_review: card.last_review ?? null,
          due: card.due,
          // Legacy SM-2
          repetition: card.repetition ?? 0,
          interval_days: card.interval ?? 0,
          easiness: card.easiness ?? 2.5,
          difficulty_score: card.difficultyScore ?? 3,
          // Timestamps
          created_at_ms: card.createdAt,
          updated_at: card.updatedAt,
          // Back-compat columns (migration 00001)
          difficulty_level: card.difficultyScore ?? 3,
          next_review_date: new Date(card.due || card.nextReviewDate || Date.now()).toISOString(),
          created_at: new Date(card.createdAt).toISOString(),
        };
        const { error } = await supabase.from('cards').upsert(row);
        if (error) throw error;
      }

      // 3. Push review logs
      for (const log of logs) {
        const row = {
          id: log.id,
          user_id: user.id,
          card_id: log.cardId,
          quality: log.quality,
          elapsed_days: log.elapsed_days,
          scheduled_days: log.scheduled_days,
          review: log.review,
          state: log.state,
          timestamp: log.timestamp,
        };
        const { error } = await supabase.from('review_logs').upsert(row);
        if (error) throw error;
      }

      alert(`Synced ${cards.length} cards, ${syncableDecks.length} decks, and ${logs.length} review logs to cloud.`);
    } catch (error) {
      console.error(error);
      alert('Failed to sync to cloud: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFetchFromCloud = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // 1. Fetch and restore decks
      if (supabaseDecks.length > 0) {
        const mappedDecks = supabaseDecks.map((d: SupabaseDeck) => ({
          id: d.id,
          name: d.title,
          // Prefer the tags array; fall back to parsing the description string
          tags: (d.tags && d.tags.length > 0)
            ? d.tags
            : (d.description ? d.description.split(',').map(t => t.trim()).filter(Boolean) : []),
          createdAt: d.created_at_ms || new Date(d.created_at).getTime(),
        }));
        await saveDecks(mappedDecks);
      }

      // 2. Fetch and restore cards with full FSRS data
      if (supabaseCards.length > 0) {
        const mappedCards = supabaseCards.map((c: SupabaseCard) => ({
          id: c.id,
          front: c.front_content,
          back: c.back_content,
          backShort: c.back_short ?? undefined,
          category: c.category ?? undefined,
          tags: c.tags ?? [],
          frontImage: c.front_image ?? undefined,
          backImage: c.back_image ?? undefined,
          frontTranslation: c.front_translation ?? undefined,
          backTranslation: c.back_translation ?? undefined,
          // FSRS — use stored values; fall back to 0 for cards synced before migration 00002
          stability: c.stability ?? 0,
          difficulty: c.difficulty_fsrs ?? 0,
          elapsed_days: c.elapsed_days ?? 0,
          scheduled_days: c.scheduled_days ?? 0,
          reps: c.reps ?? 0,
          lapses: c.lapses ?? 0,
          state: c.state ?? 0,
          last_review: c.last_review ?? undefined,
          due: c.due || new Date(c.next_review_date).getTime() || Date.now(),
          // Legacy SM-2
          repetition: c.repetition ?? 0,
          interval: c.interval_days ?? 0,
          easiness: c.easiness ?? 2.5,
          difficultyScore: c.difficulty_score || c.difficulty_level || 3,
          nextReviewDate: c.due || new Date(c.next_review_date).getTime(),
          // Timestamps
          createdAt: c.created_at_ms || new Date(c.created_at).getTime(),
          updatedAt: c.updated_at || new Date(c.created_at).getTime(),
        }));
        await importCards(mappedCards);
      }

      // 3. Fetch review logs
      const { data: cloudLogs, error: logsError } = await supabase
        .from('review_logs')
        .select('*')
        .order('timestamp', { ascending: true });

      if (logsError) throw logsError;

      if (cloudLogs && cloudLogs.length > 0) {
        // importCards handles cards; logs need to be added through addLog.
        // We store them via the StorageContext refreshData after importCards,
        // but review_logs have no direct bulk-import helper. Instead we
        // upsert them directly into IndexedDB via the dbService.
        const { dbService } = await import('../services/db');
        for (const log of cloudLogs) {
          await dbService.addLog({
            id: log.id,
            cardId: log.card_id,
            quality: log.quality,
            elapsed_days: log.elapsed_days,
            scheduled_days: log.scheduled_days,
            review: log.review,
            state: log.state,
            timestamp: log.timestamp,
          });
        }
      }

      const cardCount = supabaseCards.length;
      const logCount = cloudLogs?.length ?? 0;
      if (cardCount > 0 || logCount > 0) {
        alert(`Downloaded ${cardCount} cards and ${logCount} review logs from cloud.`);
      } else {
        alert('No data found in cloud.');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to fetch from cloud: ' + (error instanceof Error ? error.message : String(error)));
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
        targetLanguage,
        answerDisplayMode
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
          <h3 className="text-lg font-bold text-white">Study Preferences</h3>
          
          <div className="space-y-2 pt-2">
            <label className="text-sm font-bold text-slate-200">
              Answer Display Mode
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Choose which answer version to display when studying cards.
            </p>
            <select
              value={answerDisplayMode}
              onChange={(e) => setAnswerDisplayMode(e.target.value as 'short' | 'long' | 'both')}
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all font-medium text-white"
            >
              <option value="long">Long Answer (Default)</option>
              <option value="short">Short Answer (If available)</option>
              <option value="both">Both Answers</option>
            </select>
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
                  onClick={signOut}
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
