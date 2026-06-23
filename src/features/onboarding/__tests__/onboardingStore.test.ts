/**
 * onboardingStore — Unit tests
 * Backed by the in-memory MMKV stub (jest.setup.js). Verifies the per-user
 * onboarded flag round-trips and stays isolated per user.
 */

import { mmkv } from '@/core/mmkv/client';

import { isOnboarded, markOnboarded } from '../onboardingStore';

beforeEach(() => {
  mmkv.clearAll();
});

describe('onboardingStore', () => {
  it('defaults to not onboarded', () => {
    expect(isOnboarded('user-1')).toBe(false);
  });

  it('marks a user onboarded', () => {
    markOnboarded('user-1');
    expect(isOnboarded('user-1')).toBe(true);
  });

  it('tracks the flag per user', () => {
    markOnboarded('user-1');
    expect(isOnboarded('user-2')).toBe(false);
  });
});
