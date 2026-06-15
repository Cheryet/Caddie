/**
 * supabase — Core service
 * The single typed Supabase client used by the entire app. Initialised
 * once at module load, fully typed against the generated Database schema,
 * and wired to MMKV for session persistence so users stay signed in
 * across launches.
 *
 * Architecture (PROJECT_SPEC.md §14, AI_IMPLEMENTATION_GUIDE.md §11):
 * The Anthropic API key never ships in the app bundle — all Claude calls
 * go through the analyze-swing Edge Function. This client is the only
 * thing that talks to Supabase directly.
 *
 * Used by: feature hooks (useAuth, useVideos, useAnalysis, …).
 */

import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js';

import { env } from '@/constants/config';
import { mmkv } from '@/core/mmkv/client';
import type { Database } from '@/types/database';

// ───── Env validation ────────────────────────────────────────────────────
// Fail fast at module load if the build was made without Supabase env
// values. Throwing here is preferable to a silent 401 the first time a
// query runs in production.
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase env. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env ' +
      '(see .env.example) and rebuild the iOS app.',
  );
}

// ───── MMKV-backed auth storage ──────────────────────────────────────────
// supabase-js's auth module persists the session via a key/value store. We
// route it through the same MMKV instance the rest of the app uses (no
// AsyncStorage anywhere, per project rule). MMKV is synchronous; we
// return string|null directly — the Supabase contract accepts that.
const mmkvAuthStorage = {
  getItem: (key: string): string | null => mmkv.getString(key) ?? null,
  setItem: (key: string, value: string): void => {
    mmkv.set(key, value);
  },
  removeItem: (key: string): void => {
    mmkv.remove(key);
  },
};

const options: SupabaseClientOptions<'public'> = {
  auth: {
    storage: mmkvAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Disable URL-based session detection — React Native has no browser
    // location to read; deep-link sign-in (magic link) is handled
    // explicitly by useAuth in Phase 0.6.
    detectSessionInUrl: false,
  },
};

export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  options,
);
