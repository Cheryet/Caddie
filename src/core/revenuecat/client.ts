/**
 * revenuecat — Core service
 * Typed wrapper around `react-native-purchases`. The only place in the
 * app that talks to RevenueCat directly. Mirrors the supabase/auth.ts
 * pattern: the SDK knowledge lives here; orchestration with the Zustand
 * store happens in RevenueCatBootstrap.
 *
 * Used by: RevenueCatBootstrap (launch sync), useSubscription (refresh).
 *
 * Spec: PROJECT_SPEC.md §17 — entitlement is `caddie_pro` (see
 * RC_ENTITLEMENT in `src/constants/config.ts`); secret key never ships
 * (CLAUDE.md non-negotiable), only the iOS public client key is read.
 */

import Purchases from 'react-native-purchases';

import { env, RC_ENTITLEMENT } from '@/constants/config';

// Cache the in-flight init promise so concurrent callers share the same
// configure() call. A plain boolean latch would race: in dev, React's
// strict effect lifecycle can invoke our bootstrap hook twice before
// `await Purchases.configure(...)` resolves, and both invocations would
// pass a "have we initialised?" boolean check. The shared-promise
// pattern dedupes them — and `getProEntitlementActive` simply awaits it.
let initPromise: Promise<boolean> | null = null;

/**
 * Configure the RevenueCat SDK. Safe to call multiple times — concurrent
 * and subsequent calls share the original promise. Missing API key →
 * resolves to `false` with a dev warning so the simulator boots cleanly
 * before credentials are wired.
 *
 * Returns `true` if the SDK was actually configured, `false` otherwise.
 */
export function initRevenueCat(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const apiKey = env.REVENUECAT_API_KEY_IOS;
    if (!apiKey) {
      if (__DEV__) {
        console.warn(
          '[revenuecat] No iOS API key in .env — entitlement checks will return false.',
        );
      }
      return false;
    }
    await Purchases.configure({ apiKey });
    if (__DEV__) {
      // Verbose RC logs are noisy in production but invaluable when
      // debugging entitlement sync in the simulator.
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
    }
    return true;
  })();
  return initPromise;
}

/**
 * Fetch the user's `caddie_pro` activation from RevenueCat.
 *
 * - Returns `false` if the SDK hasn't been initialised (no API key).
 * - Returns `false` on any network/SDK error — Pro features default to
 *   locked when entitlement status is unknown, never the other way.
 *
 * Caller is responsible for writing the result to the Zustand store.
 */
export async function getProEntitlementActive(): Promise<boolean> {
  // If init hasn't been called yet (or was called with no API key) the
  // SDK isn't ready — entitlement defaults to inactive, never the other
  // way around. Awaiting the cached init promise also serialises us
  // behind any in-flight configure call so the SDK is ready before we
  // ask for customer info.
  const ready = initPromise ? await initPromise : false;
  if (!ready) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return Boolean(info.entitlements.active[RC_ENTITLEMENT]?.isActive);
  } catch (err) {
    if (__DEV__) {
      console.warn('[revenuecat] getCustomerInfo failed', err);
    }
    return false;
  }
}
