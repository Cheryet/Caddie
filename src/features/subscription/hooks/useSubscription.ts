/**
 * useSubscription — Feature hook
 * Public read/refresh interface for the user's Pro status. Wraps the
 * Zustand `isPro` slot so feature code never reaches into the store
 * directly for subscription state.
 *
 * Usage:
 *   const { isPro, refresh } = useSubscription();
 *
 * Call `refresh()` after any event that could change entitlement state
 * (purchase, restore, sign-in to a new account). On app launch the sync
 * is handled by <RevenueCatBootstrap /> — callers don't need to refresh
 * defensively.
 */

import { useCallback } from 'react';

import { getProEntitlementActive } from '@/core/revenuecat/client';
import { useAppStore } from '@/store/useAppStore';

interface UseSubscriptionReturn {
  isPro: boolean;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const isPro = useAppStore(s => s.isPro);
  const setIsPro = useAppStore(s => s.setIsPro);

  const refresh = useCallback(async () => {
    const active = await getProEntitlementActive();
    setIsPro(active);
  }, [setIsPro]);

  return { isPro, refresh };
}
