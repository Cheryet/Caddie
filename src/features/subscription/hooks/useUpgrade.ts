/**
 * useUpgrade — Feature hook
 * Orchestrates the Pro purchase flow for the UpgradeSheet (PROJECT_SPEC §17):
 * load the monthly/annual packages, purchase one, or restore prior purchases.
 * On a successful purchase/restore it writes `isPro` to the store (the single
 * source of truth — ProGate everywhere re-renders and delivers the feature)
 * and dismisses the sheet via `onClose`.
 *
 * Error policy (§17 / AI_IMPLEMENTATION_GUIDE §12):
 *   - user-cancelled  → silent (back out is not an error)
 *   - other failures  → Toast, sheet stays open
 *
 * Packages load lazily — only while the sheet is open (`enabled`).
 *
 * Used by: UpgradeSheet.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// Direct import (not the @/components/ui barrel) so this module never pulls
// in ProGate, which imports the UpgradeSheet — keeps the graph acyclic.
import { Toast } from '@/components/ui/Toast';
import {
  getProPackages,
  purchaseProPackage,
  restorePro,
  type ProPackage,
  type SubscriptionPeriod,
} from '@/core/revenuecat/client';
import { useAppStore } from '@/store/useAppStore';

export type UpgradeStatus =
  | 'loading' // fetching offerings
  | 'ready' // packages available
  | 'unavailable' // no offering (e.g. the Simulator, or store hiccup)
  | 'purchasing'
  | 'restoring';

interface UseUpgradeOptions {
  /** Load offerings only while the sheet is open. */
  enabled: boolean;
  /** Dismiss the sheet — called after a successful purchase/restore. */
  onClose: () => void;
}

export interface UseUpgradeReturn {
  status: UpgradeStatus;
  packages: ProPackage[];
  purchase: (period: SubscriptionPeriod) => Promise<void>;
  restore: () => Promise<void>;
}

export function useUpgrade({ enabled, onClose }: UseUpgradeOptions): UseUpgradeReturn {
  const setIsPro = useAppStore(s => s.setIsPro);

  const [status, setStatus] = useState<UpgradeStatus>('loading');
  const [packages, setPackages] = useState<ProPackage[]>([]);

  const aliveRef = useRef(true);
  // Blocks a second purchase/restore while one is in flight (status is state,
  // so it's stale inside the callbacks — a ref is the reliable guard).
  const busyRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // (Re)load offerings whenever the sheet opens; reset when it closes so the
  // next open starts fresh.
  useEffect(() => {
    if (!enabled) {
      setStatus('loading');
      setPackages([]);
      return;
    }
    let cancelled = false;
    setStatus('loading');
    (async () => {
      const pkgs = await getProPackages();
      if (cancelled || !aliveRef.current) return;
      setPackages(pkgs);
      setStatus(pkgs.length > 0 ? 'ready' : 'unavailable');
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const purchase = useCallback(
    async (period: SubscriptionPeriod): Promise<void> => {
      if (busyRef.current) return;
      const pkg = packages.find(p => p.period === period);
      if (!pkg) return;

      busyRef.current = true;
      setStatus('purchasing');
      const outcome = await purchaseProPackage(pkg.rcPackage);
      busyRef.current = false;
      if (!aliveRef.current) return;

      if (outcome.status === 'success') {
        setIsPro(true);
        Toast.show({ message: "You're Caddie Pro — enjoy.", variant: 'success' });
        onClose();
      } else if (outcome.status === 'cancelled') {
        setStatus('ready');
      } else {
        Toast.show({ message: outcome.message, variant: 'error' });
        setStatus('ready');
      }
    },
    [packages, setIsPro, onClose],
  );

  const restore = useCallback(async (): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus('restoring');
    const active = await restorePro();
    busyRef.current = false;
    if (!aliveRef.current) return;

    if (active) {
      setIsPro(true);
      Toast.show({ message: 'Purchases restored.', variant: 'success' });
      onClose();
    } else {
      Toast.show({ message: 'No purchases to restore.', variant: 'info' });
      setStatus('ready');
    }
  }, [setIsPro, onClose]);

  return { status, packages, purchase, restore };
}
