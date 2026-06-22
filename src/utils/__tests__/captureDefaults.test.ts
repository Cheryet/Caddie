/**
 * captureDefaults — Unit tests
 * Backed by the in-memory MMKV stub (jest.setup.js). Verifies defaults,
 * round-trips, and the corrupt-value fallback for swing hand & camera angle.
 */

import { mmkv } from '@/core/mmkv/client';

import {
  loadDefaultCameraAngle,
  loadDefaultSwingHand,
  setDefaultCameraAngle,
  setDefaultSwingHand,
} from '../captureDefaults';

beforeEach(() => {
  mmkv.clearAll();
});

describe('captureDefaults — swing hand', () => {
  it('defaults to right when unset', () => {
    expect(loadDefaultSwingHand()).toBe('right');
  });
  it('round-trips a set value', () => {
    setDefaultSwingHand('left');
    expect(loadDefaultSwingHand()).toBe('left');
  });
  it('falls back to right on a corrupt value', () => {
    mmkv.set('capture.defaultSwingHand', 'sideways');
    expect(loadDefaultSwingHand()).toBe('right');
  });
});

describe('captureDefaults — camera angle', () => {
  it('defaults to face-on when unset', () => {
    expect(loadDefaultCameraAngle()).toBe('face-on');
  });
  it('round-trips dtl', () => {
    setDefaultCameraAngle('dtl');
    expect(loadDefaultCameraAngle()).toBe('dtl');
  });
  it('falls back to face-on on a corrupt value', () => {
    mmkv.set('capture.defaultCameraAngle', 'overhead');
    expect(loadDefaultCameraAngle()).toBe('face-on');
  });
});
