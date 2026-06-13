/**
 * mmkv — Core service
 * Single MMKV instance for all key-value persistence in the app. Used
 * directly by feature code for ad-hoc small values (last-selected club,
 * upload queue) and indirectly by the Zustand store via the StateStorage
 * adapter below.
 *
 * MMKV is ~10× faster than AsyncStorage and synchronous — safe to read
 * at app startup without awaiting (PROJECT_SPEC.md §8).
 */

import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

export const mmkv = createMMKV({ id: 'caddie' });

/**
 * Zustand `persist` middleware expects a string-based StateStorage.
 * MMKV is synchronous; we widen the return types to Promise-compatible
 * values so the middleware accepts the adapter without complaint.
 */
export const zustandMmkvStorage: StateStorage = {
  getItem: name => mmkv.getString(name) ?? null,
  setItem: (name, value) => {
    mmkv.set(name, value);
  },
  removeItem: name => {
    mmkv.remove(name);
  },
};
