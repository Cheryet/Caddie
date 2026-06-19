/**
 * OrientationBootstrap — App-level component
 * Mounts once at app root and locks the app to portrait (Phase 5.1c). Renders
 * nothing — same Toast/PoseBootstrap provider pattern, keeping App.tsx
 * logic-free. The Comparison screen is the only screen that opts into
 * landscape; it unlocks on focus and re-locks portrait on blur.
 */

import { useEffect } from 'react';

import { lockPortrait } from '@/core/orientation';

export function OrientationBootstrap(): null {
  useEffect(() => {
    // Lock here (not just per-screen) so launching with the device held
    // sideways still comes up portrait.
    lockPortrait();
  }, []);

  return null;
}
