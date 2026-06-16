/**
 * PoseBootstrap — Feature component
 * Mounts once at app root and fires `initPose()` exactly once per
 * process lifetime. Renders nothing — Toast-style provider pattern.
 *
 * Per PROJECT_SPEC.md §22 Phase 3.1, init runs on app launch in the
 * background. The pose client is single-shot (subsequent calls are
 * no-ops while ready); the StrictMode-double-effect pattern can't
 * cause duplicate inits.
 */

import { useEffect } from 'react';

import { initPose } from '@/core/pose';

export function PoseBootstrap(): null {
  useEffect(() => {
    // Fire-and-forget; the client surfaces success/failure via its
    // own status subscription. We don't `await` here because the
    // app shouldn't block on pose readiness.
    initPose().catch(() => {
      // initPose is internally try/catched; we add this guard for
      // any TypeScript-promise-rejection edge case so the promise
      // chain never bubbles up.
    });
  }, []);

  return null;
}
