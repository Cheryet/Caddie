/**
 * RevenueCatBootstrap — Feature component
 * Side-effect-only mount point for the RevenueCat bootstrap hook.
 * Renders nothing. Lives in App.tsx alongside <AuthBootstrap /> so the
 * subscription's lifetime matches the app's.
 */

import { useRevenueCatBootstrap } from '@/features/subscription/hooks/useRevenueCatBootstrap';

export function RevenueCatBootstrap(): null {
  useRevenueCatBootstrap();
  return null;
}
