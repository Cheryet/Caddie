/**
 * frameExtractor — Utility
 * Turns a swing video into the 8 JPEG frames the analyzer reasons about,
 * one per canonical swing position (Address→Finish == Claude `frame_index`
 * 0–7). PROJECT_SPEC.md §"Frame extraction strategy" + §22 Phase 4.2.
 *
 * Two paths:
 *   1. Pose-based — pre-compute the body pose across the clip, then locate
 *      each canonical position from the landmark track (`detectSwingPositions`).
 *   2. Fallback — evenly-spaced timestamps (the spec's 10/20/30/45/55/65/75/
 *      90% schedule) when pose is unavailable (the iOS Simulator can't run
 *      Vision body pose) or the track is too sparse to classify.
 * Either way the chosen timestamps are handed to the native extractor, which
 * returns base64 JPEGs capped to `ANALYSIS_FRAME_MAX_PX` at quality
 * `ANALYSIS_FRAME_JPEG_QUALITY`. Frame extraction does NOT need Vision, so
 * the fallback path works on the Simulator.
 *
 * Deviation from the spec bullet (deliberate, recorded in TODO.md): the spec
 * says position detection happens "via `detectPose`" (single image). We use
 * the existing `precomputePoses` batch track instead — finding "max shoulder
 * rotation" / "wrists lowest" needs poses across the WHOLE swing, so calling
 * the single-frame `detectPose` ~100× would be both absurd and slower. The
 * batch path already exists (Phase 3.2's overlay uses it).
 *
 * These are 2D image-plane signals from one camera (see `core/pose/metrics`):
 * good enough to ANCHOR the swing (top = peak turn, impact = hands lowest)
 * and interpolate the rest by phase, but the precise classification is tuned
 * on a physical device (the Simulator can't run pose at all). Until then the
 * fallback covers the Simulator and any device where pose init fails.
 *
 * Part of: src/utils/
 */

import { ANALYSIS_FRAME_JPEG_QUALITY, ANALYSIS_FRAME_MAX_PX } from '@/constants/config';
import type { SwingHand } from '@/constants/camera';
import { SWING_POSITIONS } from '@/constants/swingPositions';
import {
  buildPoseTrack,
  computePoseMetrics,
  extractFrameJpegs,
  isPoseReady,
  precomputePoses,
  type PoseTrack,
} from '@/core/pose';

/**
 * Samples/second for the pose pre-compute. Mirrors the playback overlay's
 * rate (`POSE_PRECOMPUTE_FPS`) — enough temporal resolution to land on the
 * peak-turn and hands-lowest frames. Kept local so this util doesn't depend
 * on a feature hook; callers can override via `fps`.
 */
export const POSE_SAMPLE_FPS = 30;

/** Minimum classifiable poses in the track before we trust the pose path. */
const MIN_VALID_SAMPLES = 8;

export type FrameExtractionStrategy = 'pose' | 'fallback';

export interface ExtractedFrames {
  /** 8 base64-encoded JPEGs, ordered Address→Finish (== frame_index 0–7). */
  frames: string[];
  /** Which path produced the timestamps. */
  strategy: FrameExtractionStrategy;
  /** Source timestamp (ms) each frame was sampled at — parallel to `frames`. */
  timestampsMs: number[];
}

export interface ExtractAnalysisFramesOptions {
  /** Right/left-handed golfer — orients the shoulder-rotation sign so "top
   *  of backswing" is the same peak for both hands (CLAUDE.md non-negotiable). */
  swingHand: SwingHand;
  /** Clip duration in ms — drives the evenly-spaced fallback. */
  durationMs: number;
  /** Pose sampling rate for the pre-compute pass (default `POSE_SAMPLE_FPS`). */
  fps?: number;
}

/** Index of the max value in `vals` over `idxs`, ignoring nulls. -1 if none. */
function argMaxOver(idxs: number[], vals: (number | null)[]): number {
  let best = -1;
  let bestVal = -Infinity;
  for (const i of idxs) {
    const v = vals[i];
    if (v !== null && v !== undefined && v > bestVal) {
      bestVal = v;
      best = i;
    }
  }
  return best;
}

/** Index of the min value in `vals` over `idxs`, ignoring nulls. -1 if none. */
function argMinOver(idxs: number[], vals: (number | null)[]): number {
  let best = -1;
  let bestVal = Infinity;
  for (const i of idxs) {
    const v = vals[i];
    if (v !== null && v !== undefined && v < bestVal) {
      bestVal = v;
      best = i;
    }
  }
  return best;
}

/** Average y of whichever wrists are present, or null if neither is. y is
 *  top-down (origin top-left), so a LARGER value is LOWER on screen. */
function wristY(frame: PoseTrack[number]['frame']): number | null {
  const lw = frame.joints.leftWrist;
  const rw = frame.joints.rightWrist;
  if (lw && rw) return (lw.y + rw.y) / 2;
  if (lw) return lw.y;
  if (rw) return rw.y;
  return null;
}

/**
 * Locate the 8 canonical swing positions in a pre-computed pose track,
 * returning their timestamps (ms) in swing order — or `null` when the track
 * is too sparse / the swing isn't clearly captured, so the caller can fall
 * back to evenly-spaced frames.
 *
 * Pure: same track + hand → same timestamps. Strategy: anchor the swing on
 * the two robust 2D signals (top of backswing = peak shoulder rotation,
 * impact = hands at their lowest after the top), bracket it with address
 * (least-turned frame before the top) and finish (last sample), then place
 * the four intermediate positions by phase fraction. Output indices are
 * forced strictly increasing so the frames never go backwards in time.
 */
export function detectSwingPositions(
  track: PoseTrack,
  swingHand: SwingHand,
): number[] | null {
  const n = track.length;
  if (n < MIN_VALID_SAMPLES) return null;

  // Per-sample signals. Shoulder rotation is sign-normalised by hand so the
  // backswing turn is positive for both — its peak is the top of backswing.
  const rotation: (number | null)[] = new Array(n);
  const handsY: (number | null)[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const { frame } = track[i]!;
    rotation[i] = computePoseMetrics(frame, { swingHand }).shoulderRotationDeg;
    handsY[i] = wristY(frame);
  }

  const validIdxs: number[] = [];
  for (let i = 0; i < n; i++) {
    if (rotation[i] !== null) validIdxs.push(i);
  }
  if (validIdxs.length < MIN_VALID_SAMPLES) return null;

  const firstValid = validIdxs[0]!;
  const lastValid = validIdxs[validIdxs.length - 1]!;

  // Top of backswing — global peak turn. Must sit strictly inside the swing;
  // a peak at the very first/last sample means the swing wasn't captured.
  const topIdx = argMaxOver(validIdxs, rotation);
  if (topIdx <= firstValid || topIdx >= lastValid) return null;

  // Address — least-turned frame before the top (closest to a square setup).
  const beforeTop = validIdxs.filter(i => i < topIdx);
  const addressIdx = argMinOver(beforeTop, rotation);
  if (addressIdx < 0 || addressIdx >= topIdx) return null;

  // Impact — hands at their lowest after the top. Fall back to a phase guess
  // when no wrists were detected in the downswing window.
  const afterTop = validIdxs.filter(i => i > topIdx && handsY[i] !== null);
  let impactIdx =
    afterTop.length > 0
      ? argMaxOver(afterTop, handsY)
      : Math.round(topIdx + (lastValid - topIdx) * 0.66);
  if (impactIdx <= topIdx) impactIdx = topIdx + 1;
  if (impactIdx > lastValid) impactIdx = lastValid;

  const finishIdx = lastValid;

  // Intermediate positions by phase fraction between the anchors.
  const order = [
    addressIdx, // 0 Address
    Math.round(addressIdx + (topIdx - addressIdx) / 3), // 1 Takeaway
    Math.round(addressIdx + ((topIdx - addressIdx) * 2) / 3), // 2 Halfway back
    topIdx, // 3 Top
    Math.round(topIdx + (impactIdx - topIdx) / 3), // 4 Transition
    Math.round(topIdx + ((impactIdx - topIdx) * 2) / 3), // 5 Halfway down
    impactIdx, // 6 Impact
    finishIdx, // 7 Finish
  ];

  // Force strictly increasing indices so frames never repeat or reverse. If
  // the swing is too compressed to fit 8 distinct samples, give up → fallback.
  for (let k = 1; k < order.length; k++) {
    if (order[k]! <= order[k - 1]!) order[k] = order[k - 1]! + 1;
  }
  if (order[order.length - 1]! > n - 1) return null;

  return order.map(i => track[i]!.timeMs);
}

/**
 * Evenly-spaced timestamps (ms) for the no-pose fallback — each canonical
 * position's `fallbackFraction` of the clip duration (10/20/30/45/55/65/75/
 * 90%). Guaranteed strictly increasing even for degenerate short clips.
 */
export function fallbackTimestamps(durationMs: number): number[] {
  const d = durationMs > 0 ? durationMs : 0;
  const times = SWING_POSITIONS.map(p => Math.round(p.fallbackFraction * d));
  for (let i = 1; i < times.length; i++) {
    if (times[i]! <= times[i - 1]!) times[i] = times[i - 1]! + 1;
  }
  return times;
}

/**
 * Extract the 8 analysis frames from the video at `uri`. Uses the pose-based
 * detector when the engine is ready and the track is classifiable, otherwise
 * the evenly-spaced fallback; then renders the chosen timestamps to base64
 * JPEGs. The returned `strategy` records which path ran (useful for the
 * analyze request + diagnostics).
 *
 * Rejects only if the native frame render fails — a pose failure degrades to
 * the fallback rather than throwing.
 */
export async function extractAnalysisFrames(
  uri: string,
  opts: ExtractAnalysisFramesOptions,
): Promise<ExtractedFrames> {
  const fps = opts.fps ?? POSE_SAMPLE_FPS;
  let timestampsMs: number[] | null = null;
  let strategy: FrameExtractionStrategy = 'fallback';

  if (isPoseReady()) {
    try {
      const samples = await precomputePoses(uri, fps);
      const detected = detectSwingPositions(buildPoseTrack(samples), opts.swingHand);
      if (detected) {
        timestampsMs = detected;
        strategy = 'pose';
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[frameExtractor] pose detection failed; using fallback:', err);
      }
    }
  }

  if (!timestampsMs) {
    timestampsMs = fallbackTimestamps(opts.durationMs);
    strategy = 'fallback';
  }

  const frames = await extractFrameJpegs(
    uri,
    timestampsMs,
    ANALYSIS_FRAME_MAX_PX,
    ANALYSIS_FRAME_JPEG_QUALITY,
  );

  return { frames, strategy, timestampsMs };
}
