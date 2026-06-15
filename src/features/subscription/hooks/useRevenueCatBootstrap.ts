/**
 * useRevenueCatBootstrap — Feature hook
 * Runs once on app launch to (a) configure the RevenueCat SDK and (b)
 * sync the user's `caddie_pro` entitlement into the Zustand store. The
 * store's `isPro` value is the single source of truth from that point
 * on; ProGate and useSubscription read from it.
 *
 * Mounted exactly once, by the <RevenueCatBootstrap /> component in App.tsx.
 */

import { useEffect } from 'react';

import {
  getProEntitlementActive,
  initRevenueCat,
} from '@/core/revenuecat/client';
import { useAppStore } from '@/store/useAppStore';

export function useRevenueCatBootstrap(): void {
  const setIsPro = useAppStore(s => s.setIsPro);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Configure the SDK first, then fetch the entitlement. The client
      // wrapper guarantees both calls resolve safely when the API key is
      // absent — the simulator boots regardless.
      await initRevenueCat();
      const active = await getProEntitlementActive();
      if (cancelled) return;
      setIsPro(active);
    })();

    return () => {
      cancelled = true;
    };
  }, [setIsPro]);
}
