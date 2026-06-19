/**
 * core/orientation — SDK wrapper
 * Thin isolation layer over react-native-orientation-locker (mirrors how
 * core/pose hides caddie-pose). Nothing outside this folder imports the
 * library directly, so a swap or a jest mock touches one module.
 *
 * Model (Phase 5.1c): the app is portrait-first — locked to portrait at
 * launch (OrientationBootstrap) and on leaving any screen that opted in. The
 * Comparison screen calls `unlockOrientation()` on focus so the device can
 * rotate to the landscape side-by-side layout, then `lockPortrait()` on blur.
 * The OS intersects the unlocked mask with Info.plist's supported set
 * (portrait + landscape L/R — never upside-down), so unlock can't yield an
 * orientation the app doesn't support.
 */

import Orientation from 'react-native-orientation-locker';

/** Force portrait and rotate back to it if currently landscape. */
export function lockPortrait(): void {
  Orientation.lockToPortrait();
}

/** Allow free rotation (constrained to Info.plist's supported orientations). */
export function unlockOrientation(): void {
  Orientation.unlockAllOrientations();
}
