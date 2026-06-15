/**
 * useAuthBootstrap — Feature hook
 * Runs once on app launch to (a) restore any cached session from MMKV
 * via the Supabase client and (b) subscribe to subsequent auth state
 * changes. The Zustand store is the single source of truth for `user`
 * after this hook fires.
 *
 * Mounted exactly once, by the <AuthBootstrap /> component in App.tsx.
 */

import { useEffect } from 'react';

import * as authService from '@/core/supabase/auth';
import { useAppStore } from '@/store/useAppStore';

export function useAuthBootstrap(): void {
  const setUser = useAppStore(s => s.setUser);
  const setAuthLoading = useAppStore(s => s.setAuthLoading);

  useEffect(() => {
    let cancelled = false;

    // Restore any session the Supabase SDK has cached in MMKV. This is
    // synchronous on disk but the SDK wraps it in a Promise.
    authService.getSession().then(session => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Keep the store in sync for all subsequent events: SIGNED_IN,
    // SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED.
    const subscription = authService.onAuthStateChange(session => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setUser, setAuthLoading]);
}
