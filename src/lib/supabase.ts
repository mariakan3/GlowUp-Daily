import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

/**
 * Only the project URL and the publishable key ever ship in the app; row level security on every table
 * keeps each user's data private. `EXPO_PUBLIC_*` env vars (e.g. in .env.local) override app.json `extra`.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabasePublishableKey?: string };

export const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '').trim();
const supabasePublishableKey = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || extra.supabasePublishableKey || '').trim();

const looksSecret = /^sb_secret_/.test(supabasePublishableKey) || /service_role/.test(supabasePublishableKey);

export const supabaseConfigError: string | null = !supabaseUrl || !supabasePublishableKey
  ? 'Supabase is not configured yet. Add supabaseUrl and supabasePublishableKey to app.json → expo.extra.'
  : looksSecret
    ? 'A secret Supabase key was configured. Use the publishable key instead.'
    : null;

export const supabase: SupabaseClient | null = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
