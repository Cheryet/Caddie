/**
 * captureDefaults — Utility
 * Single home for the recording defaults a new swing inherits: swing hand,
 * camera angle, and club. Persisted in MMKV so the camera and import flows
 * read them instantly at startup (no async, works offline).
 *
 * Swing hand is ALSO the source of truth on `profiles.swing_hand` (set from
 * ProfileScreen); this MMKV copy is a fast local mirror that `useProfile`
 * keeps in sync on load. Camera angle lives only here. Club delegates to
 * `lastClub.ts` — the persisted "last club" is the de-facto default.
 *
 * Resolves the standing "Profile-driven capture defaults" item: CameraScreen
 * / ImportConfirmSheet initialise from these instead of hardcoding.
 *
 * Used by: useProfile, ProfileScreen, CameraScreen, ImportConfirmSheet.
 */

import {
  DEFAULT_CAMERA_ANGLE,
  DEFAULT_SWING_HAND,
  type CameraAngle,
  type SwingHand,
} from '@/constants/camera';
import { mmkv } from '@/core/mmkv/client';

const SWING_HAND_KEY = 'capture.defaultSwingHand';
const CAMERA_ANGLE_KEY = 'capture.defaultCameraAngle';

export function loadDefaultSwingHand(): SwingHand {
  const raw = mmkv.getString(SWING_HAND_KEY);
  return raw === 'right' || raw === 'left' ? raw : DEFAULT_SWING_HAND;
}

export function setDefaultSwingHand(hand: SwingHand): void {
  mmkv.set(SWING_HAND_KEY, hand);
}

export function loadDefaultCameraAngle(): CameraAngle {
  const raw = mmkv.getString(CAMERA_ANGLE_KEY);
  return raw === 'face-on' || raw === 'dtl' ? raw : DEFAULT_CAMERA_ANGLE;
}

export function setDefaultCameraAngle(angle: CameraAngle): void {
  mmkv.set(CAMERA_ANGLE_KEY, angle);
}

// Club: the persisted "last club" IS the default. Re-export under the
// capture-defaults vocabulary so callers have one import surface.
export {
  loadLastClub as loadDefaultClub,
  setLastClub as setDefaultClub,
} from '@/utils/lastClub';
