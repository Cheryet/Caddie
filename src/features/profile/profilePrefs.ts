/**
 * profilePrefs — Feature store (MMKV)
 * Local persistence for the ProfileScreen rows whose behaviour isn't wired
 * yet (PROJECT_SPEC §22 Phase 5.4 builds the UI; the wiring is deferred —
 * see TODO.md): the four notification/preference toggles plus the handicap
 * input. Stored in MMKV so the controls feel real and survive relaunches.
 *
 * These are intentionally NOT in the Zustand store (not global) and NOT yet
 * in Postgres (handicap has no `profiles` column). When a row is wired to
 * real behaviour/backend, its value migrates out of here.
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
  handicap: 'profile.handicap',
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
  handicap: string;
}

// Prototype defaults (Design §06 state, L1777).
const DEFAULTS: ProfilePrefs = {
  autoAnalyse: true,
  poseDefault: false,
  practiceReminders: true,
  weeklyEmail: false,
  handicap: '',
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
    handicap: mmkv.getString(KEYS.handicap) ?? DEFAULTS.handicap,
  };
}

export function setProfileToggle(key: ProfileToggleKey, value: boolean): void {
  mmkv.set(KEYS[key], value ? 'true' : 'false');
}

export function setHandicapPref(value: string): void {
  mmkv.set(KEYS.handicap, value);
}

interface UseProfilePrefsReturn {
  prefs: ProfilePrefs;
  toggle: (key: ProfileToggleKey) => void;
  setHandicap: (value: string) => void;
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

  const setHandicap = useCallback((value: string) => {
    setHandicapPref(value);
    setPrefs(prev => ({ ...prev, handicap: value }));
  }, []);

  return { prefs, toggle, setHandicap };
}
