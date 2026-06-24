/**
 * profilePrefs — Feature store (MMKV)
 * Local persistence for the ProfileScreen rows whose behaviour isn't wired
 * to a backend yet (PROJECT_SPEC §22 Phase 5.4 builds the UI; the wiring is
 * deferred — see TODO.md): the four notification/preference toggles.
 *
 * These are intentionally NOT in the Zustand store (not global). When a row
 * is wired to real behaviour/backend, its value migrates out of here — the
 * handicap did exactly that and now lives in `profiles.handicap` (see
 * useProfile).
 *
 * Booleans are stored as 'true'/'false' strings — the MMKV instance's
 * confirmed surface is getString/set (see core/mmkv/client.ts).
 *
 * Used by: ProfileScreen (via useProfilePrefs).
 */

import { useCallback, useState } from 'react';

import { mmkv } from '@/core/mmkv/client';

const KEYS = {
  autoAnalyse: 'profile.autoAnalyse',
  poseDefault: 'profile.poseDefault',
  practiceReminders: 'profile.practiceReminders',
  weeklyEmail: 'profile.weeklyEmail',
} as const;

export type ProfileToggleKey =
  | 'autoAnalyse'
  | 'poseDefault'
  | 'practiceReminders'
  | 'weeklyEmail';

export interface ProfilePrefs {
  autoAnalyse: boolean;
  poseDefault: boolean;
  practiceReminders: boolean;
  weeklyEmail: boolean;
}

// Prototype defaults (Design §06 state, L1777).
const DEFAULTS: ProfilePrefs = {
  autoAnalyse: true,
  poseDefault: false,
  practiceReminders: true,
  weeklyEmail: false,
};

function loadBool(key: string, fallback: boolean): boolean {
  const raw = mmkv.getString(key);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return fallback;
}

export function loadProfilePrefs(): ProfilePrefs {
  return {
    autoAnalyse: loadBool(KEYS.autoAnalyse, DEFAULTS.autoAnalyse),
    poseDefault: loadBool(KEYS.poseDefault, DEFAULTS.poseDefault),
    practiceReminders: loadBool(
      KEYS.practiceReminders,
      DEFAULTS.practiceReminders,
    ),
    weeklyEmail: loadBool(KEYS.weeklyEmail, DEFAULTS.weeklyEmail),
  };
}

export function setProfileToggle(key: ProfileToggleKey, value: boolean): void {
  mmkv.set(KEYS[key], value ? 'true' : 'false');
}

interface UseProfilePrefsReturn {
  prefs: ProfilePrefs;
  toggle: (key: ProfileToggleKey) => void;
}

export function useProfilePrefs(): UseProfilePrefsReturn {
  const [prefs, setPrefs] = useState<ProfilePrefs>(loadProfilePrefs);

  const toggle = useCallback((key: ProfileToggleKey) => {
    setPrefs(prev => {
      const next = !prev[key];
      setProfileToggle(key, next);
      return { ...prev, [key]: next };
    });
  }, []);

  return { prefs, toggle };
}
