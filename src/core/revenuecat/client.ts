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

import Purchases, { type PurchasesPackage } from 'react-native-purchases';

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

// ───── Purchase flow (Phase 4.5) ───────────────────────────────────────────

export type SubscriptionPeriod = 'monthly' | 'annual';

export interface ProPackage {
  period: SubscriptionPeriod;
  /** Localized store price, e.g. "$9.99" / "£8.99" — display as-is. */
  priceString: string;
  /** The raw RevenueCat package — pass straight back to purchaseProPackage. */
  rcPackage: PurchasesPackage;
}

export type PurchaseOutcome =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/**
 * The monthly + annual Pro packages from the current RevenueCat offering,
 * with localized prices. Returns [] when the SDK isn't configured (no API
 * key — the Simulator) or the offering can't be fetched; the UpgradeSheet
 * renders a "plans unavailable" state rather than crashing.
 */
export async function getProPackages(): Promise<ProPackage[]> {
  const ready = initPromise ? await initPromise : false;
  if (!ready) return [];
  try {
    const { current } = await Purchases.getOfferings();
    if (!current) return [];
    const packages: ProPackage[] = [];
    if (current.monthly) {
      packages.push({
        period: 'monthly',
        priceString: current.monthly.product.priceString,
        rcPackage: current.monthly,
      });
    }
    if (current.annual) {
      packages.push({
        period: 'annual',
        priceString: current.annual.product.priceString,
        rcPackage: current.annual,
      });
    }
    return packages;
  } catch (err) {
    if (__DEV__) {
      console.warn('[revenuecat] getOfferings failed', err);
    }
    return [];
  }
}

/**
 * Purchase a Pro package. Returns a typed outcome:
 *   - `success`   — caddie_pro is now active.
 *   - `cancelled` — the user backed out of the StoreKit sheet (silent, per
 *                   PROJECT_SPEC §17 — not surfaced as an error).
 *   - `error`     — anything else, with a user-facing message.
 * The caller writes `isPro` to the store on success.
 */
export async function purchaseProPackage(
  pkg: PurchasesPackage,
): Promise<PurchaseOutcome> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const active = Boolean(
      customerInfo.entitlements.active[RC_ENTITLEMENT]?.isActive,
    );
    return active
      ? { status: 'success' }
      : { status: 'error', message: "Purchase didn't activate Pro — try Restore." };
  } catch (err) {
    // RevenueCat flags a user-cancelled StoreKit sheet on the thrown error.
    if ((err as { userCancelled?: boolean })?.userCancelled) {
      return { status: 'cancelled' };
    }
    if (__DEV__) {
      console.warn('[revenuecat] purchasePackage failed', err);
    }
    return { status: 'error', message: 'Purchase failed. Please try again.' };
  }
}

/**
 * Restore prior purchases. Returns whether caddie_pro is active afterwards.
 * False on any SDK error or when there's nothing to restore.
 */
export async function restorePro(): Promise<boolean> {
  const ready = initPromise ? await initPromise : false;
  if (!ready) return false;
  try {
    const info = await Purchases.restorePurchases();
    return Boolean(info.entitlements.active[RC_ENTITLEMENT]?.isActive);
  } catch (err) {
    if (__DEV__) {
      console.warn('[revenuecat] restorePurchases failed', err);
    }
    return false;
  }
}
