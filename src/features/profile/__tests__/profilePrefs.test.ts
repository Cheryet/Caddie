/**
 * profilePrefs — Unit tests
 * Backed by the in-memory MMKV stub (jest.setup.js). Verifies the prototype
 * defaults and round-trips for the notification/preference toggles. (The
 * handicap moved to `profiles.handicap` — see handicap.test.ts / useProfile.)
 */

import { mmkv } from '@/core/mmkv/client';

import { loadProfilePrefs, setProfileToggle } from '../profilePrefs';

beforeEach(() => {
  mmkv.clearAll();
});

describe('profilePrefs', () => {
  it('returns the prototype defaults when unset', () => {
    expect(loadProfilePrefs()).toEqual({
      autoAnalyse: true,
      poseDefault: false,
      practiceReminders: true,
      weeklyEmail: false,
    });
  });

  it('round-trips toggles', () => {
    setProfileToggle('autoAnalyse', false);
    setProfileToggle('poseDefault', true);
    const prefs = loadProfilePrefs();
    expect(prefs.autoAnalyse).toBe(false);
    expect(prefs.poseDefault).toBe(true);
  });
});
