/**
 * core/pose/track — Pre-computed pose track
 * A time-indexed sequence of poses for a whole video, built once from
 * the native batch extractor (`precomputePoses`). Playback and scrubbing
 * then look up the pose for the current timestamp instantly, so the
 * skeleton animates smoothly instead of being detected on demand.
 *
 * Spec: deliberate enhancement beyond PROJECT_SPEC §22 3.2 ("as the user
 * scrubs") — rationale recorded in TODO.md.
 */

import { toPoseFrame, type PoseFrame } from './landmarks';
import type { PoseVideoFrame } from './types';

export interface PoseTrackSample {
  /** Sample timestamp in milliseconds from the start of the clip. */
  timeMs: number;
  /** The mapped pose at that timestamp. */
  frame: PoseFrame;
}

export type PoseTrack = readonly PoseTrackSample[];

/**
 * Build a sorted, lookup-ready track from the raw native sample frames.
 * Each frame's landmarks are mapped through `toPoseFrame`; the samples
 * are sorted by time (the native batch can return them out of order).
 */
export function buildPoseTrack(frames: PoseVideoFrame[]): PoseTrack {
  return frames
    .map(f => ({
      timeMs: f.timeMs,
      frame: toPoseFrame(f.landmarks, f.height > 0 ? f.width / f.height : 0),
    }))
    .sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * The pose at `timeMs` — the latest sample at or before it (binary
 * search), clamped to the track ends. Returns null for an empty track.
 */
export function poseAt(track: PoseTrack, timeMs: number): PoseFrame | null {
  if (track.length === 0) return null;
  if (timeMs <= track[0]!.timeMs) return track[0]!.frame;
  const last = track[track.length - 1]!;
  if (timeMs >= last.timeMs) return last.frame;

  // Largest index whose timeMs <= target.
  let lo = 0;
  let hi = track.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (track[mid]!.timeMs <= timeMs) lo = mid;
    else hi = mid - 1;
  }
  return track[lo]!.frame;
}
