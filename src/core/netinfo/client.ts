/**
 * core/netinfo — SDK wrapper
 * Thin isolation layer over @react-native-community/netinfo (mirrors
 * core/orientation, core/pose). Nothing outside this folder imports the
 * library directly, so a swap or a jest mock touches one module. No React
 * here — the `useNetworkStatus` hook lives in src/components.
 *
 * Status model: only an explicit `isConnected === false` is treated as
 * offline. A null/unknown connection (transient, or the very first event)
 * counts as online so we never flash the banner on startup.
 */

import NetInfo from '@react-native-community/netinfo';
import type { NetInfoState } from '@react-native-community/netinfo';

export type NetStatus = 'online' | 'offline';

function toStatus(state: NetInfoState): NetStatus {
  return state.isConnected === false ? 'offline' : 'online';
}

/** Subscribe to status changes. Fires once immediately with the current
 *  state. Returns an unsubscribe function. */
export function subscribeNetStatus(cb: (status: NetStatus) => void): () => void {
  return NetInfo.addEventListener(state => cb(toStatus(state)));
}

export async function fetchNetStatus(): Promise<NetStatus> {
  const state = await NetInfo.fetch();
  return toStatus(state);
}
