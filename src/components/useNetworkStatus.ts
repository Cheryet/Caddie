/**
 * useNetworkStatus — Shared hook
 * Subscribes to the network status via the core/netinfo wrapper and exposes
 * `isOffline`. Starts optimistic (online) so a banner never flashes before
 * the first event. Used by OfflineBanner and any screen that needs to gate a
 * network action (e.g. PlaybackScreen's "Analyse with AI").
 */

import { useEffect, useState } from 'react';

import { subscribeNetStatus, type NetStatus } from '@/core/netinfo/client';

export function useNetworkStatus(): { isOffline: boolean } {
  const [status, setStatus] = useState<NetStatus>('online');

  useEffect(() => {
    // Fires once immediately with the current status, then on every change.
    return subscribeNetStatus(setStatus);
  }, []);

  return { isOffline: status === 'offline' };
}
