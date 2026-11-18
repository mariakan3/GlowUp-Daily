import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase, supabaseConfigError } from '../lib/supabase';
import { startUserSession, stopUserSession } from '../sync/syncEngine';

export type AuthStatus = 'unconfigured' | 'loading' | 'signedOut' | 'loadingData' | 'ready' | 'dataError';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  dataError: string | null;
  init: () => void;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<string | null>;
  resetPasswordWithCode: (email: string, code: string, newPassword: string) => Promise<string | null>;
  retryData: () => void;
}

let initialized = false;
let activeUserId: string | null = null;

const friendly = (message: string) => {
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match. Try again or reset your password.';
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first. Check your inbox for the link.';
  if (/already registered|already exists/i.test(message)) return 'An account with this email already exists. Sign in instead.';
  if (/password should be at least|weak password/i.test(message)) return 'Choose a password with at least 8 characters.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a minute and try again.';
  if (/token has expired|invalid.*otp|otp.*invalid/i.test(message)) return 'That code is wrong or expired. Request a new one.';
  if (/fetch|network/i.test(message)) return 'Can’t reach the server. Check your connection.';
  return message;
};

export const useAuthStore = create<AuthState>((set, get) => {
  const loadData = async (session: Session) => {
    const userId = session.user.id;
    activeUserId = userId;
    set({ status: 'loadingData', session, dataError: null });
    try {
      const name = String(session.user.user_metadata?.display_name ?? '');
      await startUserSession(userId, name);
      if (activeUserId === userId) set({ status: 'ready' });
    } catch (e) {
      if (activeUserId === userId) set({ status: 'dataError', dataError: e instanceof Error ? e.message : String(e) });
    }
  };

  const handleSession = (session: Session | null) => {
    if (session?.user) {
      if (activeUserId === session.user.id && get().status !== 'signedOut') {
        set({ session });
        return;
      }
      void loadData(session);
    } else if (activeUserId) {
      activeUserId = null;
      void stopUserSession().then(() => set({ status: 'signedOut', session: null }));
    } else {
      set({ status: 'signedOut', session: null });
    }
  };

  return {
    status: supabaseConfigError ? 'unconfigured' : 'loading',
    session: null,
    dataError: null,

    init: () => {
      if (initialized || !supabase) return;
      initialized = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        // Supabase recommends not awaiting other auth calls inside this callback.
        setTimeout(() => handleSession(session), 0);
      });
    },

    signIn: async (email, password) => {
      if (!supabase) return supabaseConfigError;
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? friendly(error.message) : null;
    },

    signUp: async (email, password, name) => {
      if (!supabase) return { error: supabaseConfigError, needsConfirmation: false };
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } });
      if (error) return { error: friendly(error.message), needsConfirmation: false };
      return { error: null, needsConfirmation: !data.session };
    },

    signOut: async () => {
      if (!supabase) return;
      activeUserId = null;
      await stopUserSession();
      await supabase.auth.signOut();
      set({ status: 'signedOut', session: null });
    },

    sendPasswordReset: async (email) => {
      if (!supabase) return supabaseConfigError;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      return error ? friendly(error.message) : null;
    },

    resetPasswordWithCode: async (email, code, newPassword) => {
      if (!supabase) return supabaseConfigError;
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
      if (error) return friendly(error.message);
      const res = await supabase.auth.updateUser({ password: newPassword });
      return res.error ? friendly(res.error.message) : null;
    },

    retryData: () => {
      const session = get().session;
      if (session) void loadData(session);
    },
  };
});
