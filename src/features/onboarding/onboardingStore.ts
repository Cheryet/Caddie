/**
 * onboardingStore — Feature store
 * Tracks whether a user has finished first-run profile setup. Backed by a
 * per-user MMKV flag (`onboarding.done:{userId}`) so a second account on the
 * same device still onboards, and reactive via useSyncExternalStore so
 * RootNavigator swaps Onboarding → Tabs the instant setup completes — the
 * same external-singleton pattern the app uses for Toast / UpgradeSheet.
 *
 * Not in the Zustand store: the global store stays auth/subscription/theme
 * only (PROJECT_SPEC §11). This is a self-contained gate.
 *
 * Used by: RootNavigator (gate), OnboardingScreen (markOnboarded).
 */

import { useSyncExternalStore } from 'react';

import { mmkv } from '@/core/mmkv/client';

const key = (userId: string): string => `onboarding.done:${userId}`;

const listeners = new Set<() => void>();
function emit(): void {
  listeners.forEach(l => l());
}

export function isOnboarded(userId: string): boolean {
  return mmkv.getString(key(userId)) === 'true';
}

export function markOnboarded(userId: string): void {
  mmkv.set(key(userId), 'true');
  emit();
}

/** Reactive read. Returns true when there's no user (the auth gate handles
 *  that branch) so callers never render Onboarding for a signed-out app. */
export function useIsOnboarded(userId: string | null): boolean {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => (userId ? isOnboarded(userId) : true),
  );
}
