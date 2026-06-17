/**
 * usePoseFrame — Feature hook
 * Drives per-frame pose detection for the playback overlay. Given the
 * video uri, the current scrub position, and an enabled flag, it
 * detects the body pose on the current frame and returns the mapped
 * `PoseFrame` for the overlay to render.
 *
 * Design choices:
 *   - Gated on `enabled` AND the engine being `ready` AND a uri — when
 *     any is false the skeleton is cleared (no stale pose left on
 *     screen).
 *   - Debounced: detection only fires once `currentMs` settles for
 *     DETECT_DEBOUNCE_MS. During playback `currentMs` ticks every
 *     ~100ms, so this naturally limits detection to paused / scrubbing
 *     (matches PROJECT_SPEC §22 "as the user scrubs" and the Risk 3
 *     "settle-based, 30fps" mitigation).
 *   - Latest-wins: a monotonic request token drops stale async results
 *     if the user moves on before a detection resolves.
 *
 * Part of: src/features/pose/
 */

import { useEffect, useRef, useState } from 'react';

import { detectPoseFrame, toPoseFrame, type PoseFrame } from '@/core/pose';
import { usePoseStatus } from '@/features/pose/hooks/usePoseStatus';

const DETECT_DEBOUNCE_MS = 140;

interface UsePoseFrameArgs {
  /** Local file path or signed URL of the video being played. */
  uri: string | null;
  /** Current playback position in milliseconds. */
  currentMs: number;
  /** Whether the pose overlay is toggled on. */
  enabled: boolean;
}

interface UsePoseFrameReturn {
  /** Pose for the current frame, or null when nothing is shown. */
  frame: PoseFrame | null;
  /** True while a detection is in flight (drives no UI yet; exposed for parity). */
  isDetecting: boolean;
}

export function usePoseFrame({
  uri,
  currentMs,
  enabled,
}: UsePoseFrameArgs): UsePoseFrameReturn {
  const { status } = usePoseStatus();
  const ready = status === 'ready';
  const active = enabled && ready && uri !== null;

  const [frame, setFrame] = useState<PoseFrame | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Monotonic token so a superseded detection's result is ignored.
  const requestToken = useRef(0);

  // Clear any rendered skeleton the moment the feature goes inactive.
  useEffect(() => {
    if (!active) {
      requestToken.current += 1; // invalidate any in-flight detection
      setFrame(null);
      setIsDetecting(false);
    }
  }, [active]);

  useEffect(() => {
    if (!active || uri === null) return;

    const token = ++requestToken.current;
    const handle = setTimeout(() => {
      setIsDetecting(true);
      detectPoseFrame(uri, currentMs)
        .then(result => {
          if (token !== requestToken.current) return; // superseded
          setFrame(toPoseFrame(result.landmarks, result.width / result.height));
        })
        .catch(() => {
          if (token !== requestToken.current) return;
          setFrame(null);
        })
        .finally(() => {
          if (token !== requestToken.current) return;
          setIsDetecting(false);
        });
    }, DETECT_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [active, uri, currentMs]);

  return { frame, isDetecting };
}
