/**
 * useAppStore — Global state
 * The ONE Zustand store. Holds the four values that are genuinely global
 * — auth user, auth loading flag, subscription status, theme preference —
 * and nothing else. Server data (videos, analyses) lives in feature
 * hooks; local UI state lives in components. If you're about to add a
 * field here, re-read AI_IMPLEMENTATION_GUIDE.md §9 first.
 *
 * Persistence: `theme` and `isPro` are written to MMKV so they survive
 * app launches. `user` is restored on launch by Supabase's session
 * loader (Phase 0.6), and `isAuthLoading` is transient by design.
 *
 * Source of truth: PROJECT_SPEC.md §11 State Management.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandMmkvStorage } from '@/core/mmkv/client';
import type { User } from '@/types/user';

export type Theme = 'dark' | 'light';

interface AppStore {
  user: User | null;
  isAuthLoading: boolean;
  isPro: boolean;
  theme: Theme;
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setIsPro: (isPro: boolean) => void;
  setTheme: (theme: Theme) => void;
}

const PERSIST_KEY = 'app-store';
const PERSIST_VERSION = 1;

export const useAppStore = create<AppStore>()(
  persist(
    set => ({
      user: null,
      isAuthLoading: true,
      isPro: false,
      theme: 'dark',
      setUser: user => set({ user }),
      setAuthLoading: isAuthLoading => set({ isAuthLoading }),
      setIsPro: isPro => set({ isPro }),
      setTheme: theme => set({ theme }),
    }),
    {
      name: PERSIST_KEY,
      version: PERSIST_VERSION,
      storage: createJSONStorage(() => zustandMmkvStorage),
      // Only persist the two flags the spec calls out. Everything else is
      // either restored from Supabase (user) or transient (isAuthLoading).
      partialize: state => ({ theme: state.theme, isPro: state.isPro }),
    },
  ),
);
