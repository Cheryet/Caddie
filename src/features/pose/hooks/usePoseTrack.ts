/**
 * usePoseTrack — Feature hook
 * Pre-computes the body pose for the whole clip once (when pose is
 * enabled), caches the resulting time-indexed track, and exposes a
 * `frameAt(ms)` lookup. The playback overlay calls `frameAt(currentMs)`
 * every tick, so the skeleton animates smoothly during playback AND
 * scrubbing instead of being detected on demand (which lagged).
 *
 * - Gated on `enabled` AND the engine being `ready` AND a uri.
 * - One precompute per uri; the track is cached for the session so
 *   re-toggling pose is instant.
 * - `status` drives the "Analyzing pose…" indicator; `elapsedSec` feeds
 *   its elapsed-time label (mirrors the AI-analysis loading pattern).
 * - Latest-wins: a request token abandons a stale precompute if the user
 *   switches videos or disables pose before it resolves.
 *
 * Spec: deliberate enhancement beyond PROJECT_SPEC §22 3.2 ("as the user
 * scrubs") — rationale recorded in TODO.md.
 *
 * Part of: src/features/pose/
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  buildPoseTrack,
  poseAt,
  precomputePoses,
  type PoseFrame,
  type PoseTrack,
} from '@/core/pose';
import { usePoseStatus } from '@/features/pose/hooks/usePoseStatus';

/** Samples per second to pre-compute. 30 = smooth at 1× and in slow-mo. */
export const POSE_PRECOMPUTE_FPS = 30;

export type PoseTrackStatus = 'idle' | 'analyzing' | 'ready' | 'error';

interface UsePoseTrackArgs {
  /** Local file path or signed URL of the video. */
  uri: string | null;
  /** Whether the pose overlay is toggled on. */
  enabled: boolean;
}

interface UsePoseTrackReturn {
  status: PoseTrackStatus;
  /** Pose for a playback position in ms (null when not ready). */
  frameAt: (timeMs: number) => PoseFrame | null;
  /** Seconds elapsed during analysis — drives the loading label. */
  elapsedSec: number;
}

export function usePoseTrack({
  uri,
  enabled,
}: UsePoseTrackArgs): UsePoseTrackReturn {
  const { status: engineStatus } = usePoseStatus();
  const ready = engineStatus === 'ready';
  const active = enabled && ready && uri !== null;

  const [status, setStatus] = useState<PoseTrackStatus>('idle');
  const [track, setTrack] = useState<PoseTrack | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Session cache of tracks by uri, and a token to drop stale results.
  const cacheRef = useRef<Map<string, PoseTrack>>(new Map());
  const requestToken = useRef(0);

  useEffect(() => {
    if (!active || uri === null) {
      requestToken.current += 1;
      setStatus('idle');
      setTrack(null);
      return;
    }

    const cached = cacheRef.current.get(uri);
    if (cached) {
      setTrack(cached);
      setStatus('ready');
      return;
    }

    const token = ++requestToken.current;
    setTrack(null);
    setStatus('analyzing');
    precomputePoses(uri, POSE_PRECOMPUTE_FPS)
      .then(frames => {
        if (token !== requestToken.current) return;
        const built = buildPoseTrack(frames);
        cacheRef.current.set(uri, built);
        setTrack(built);
        setStatus('ready');
      })
      .catch(() => {
        if (token !== requestToken.current) return;
        setStatus('error');
        setTrack(null);
      });
  }, [active, uri]);

  // Elapsed-time ticker while analyzing.
  useEffect(() => {
    if (status !== 'analyzing') {
      setElapsedSec(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [status]);

  const frameAt = useCallback(
    (timeMs: number): PoseFrame | null =>
      track ? poseAt(track, timeMs) : null,
    [track],
  );

  return { status, frameAt, elapsedSec };
}
