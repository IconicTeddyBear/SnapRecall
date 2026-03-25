import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Mail, Lock, Loader2, LogOut, CheckCircle2 } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';

export const AuthUI: React.FC = () => {
  const { user } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [justSignedIn, setJustSignedIn] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setJustSignedIn(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setJustSignedIn(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setJustSignedIn(false);
    await supabase.auth.signOut();
  };

  // Signed-in state
  if (user) {
    return (
      <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-4">
        <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {user.email?.[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
            <p className="text-sm font-bold text-white">Signed in</p>
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors flex-shrink-0"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    );
  }

  // Just submitted but auth state hasn't updated yet (sign-up email case)
  if (justSignedIn && isSignUp) {
    return (
      <div className="p-5 bg-violet-500/10 border border-violet-500/30 rounded-2xl text-center space-y-2">
        <CheckCircle2 size={32} className="text-violet-400 mx-auto" />
        <p className="font-bold text-white">Check your email</p>
        <p className="text-sm text-slate-400">We sent a confirmation link to <span className="text-white">{email}</span></p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-slate-400">
          {isSignUp
            ? 'Sign up to sync your flashcards across devices'
            : 'Sign in to access your synchronized flashcards'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-300 ml-1">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail size={18} className="text-slate-500" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-300 ml-1">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock size={18} className="text-slate-500" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-6 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all flex items-center justify-center shadow-lg shadow-violet-500/25 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            isSignUp ? 'Sign Up' : 'Sign In'
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
          className="text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors"
        >
          {isSignUp
            ? 'Already have an account? Sign In'
            : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
};
