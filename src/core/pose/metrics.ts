/**
 * core/pose/metrics — Derived biomechanics metrics
 * Pure geometry over a single mapped `PoseFrame`: shoulder rotation,
 * hip–shoulder separation (X-Factor), spine tilt, and head delta from
 * address. PROJECT_SPEC §22 Phase 3.3.
 *
 * These are **2D image-plane proxies** — a single phone camera can't
 * recover true axial (around-the-spine) rotation, so e.g. "shoulder
 * rotation" here is the tilt of the shoulder line in the frame, not a
 * degrees-of-turn figure. That's deliberately good enough for the one
 * consumer that matters: Phase 4 frame classification reads these as
 * *relative* signals over the pre-computed track (top of backswing =
 * peak shoulder turn, impact = separation crossing, …), where the shape
 * of the curve matters, not the absolute accuracy of any one number.
 *
 * The user-facing metric overlay from the §3.3 bullet is intentionally
 * NOT built (see TODO.md "Phase 3.3 — metric overlay display deferred"):
 * approximate values shown as precise readouts would mislead and clutter
 * the playback surface. This module is the headless half that earns its
 * place by feeding Phase 4.
 *
 * Everything returns `null` per-metric when its joints are absent — the
 * caller decides how to treat a partial frame.
 */

import type { SwingHand } from '@/constants/camera';
import type { PoseFrame } from './landmarks';

const RAD2DEG = 180 / Math.PI;

/** A 2D point/vector in normalised frame space (also used for aspect-
 *  corrected vectors). */
interface Vec2 {
  x: number;
  y: number;
}

/** The derived metrics for one frame. Degrees unless noted; `null` when
 *  the joints a metric needs aren't present in the frame. */
export interface PoseMetrics {
  /** Image-plane tilt of the shoulder line from horizontal, degrees,
   *  sign-normalised by hand so turning *into* the backswing (trail
   *  shoulder rising) reads positive. 2D proxy for shoulder rotation. */
  shoulderRotationDeg: number | null;
  /** Shoulder-line tilt minus hip-line tilt (the "X-Factor"), degrees,
   *  sign-normalised by hand. Camera roll cancels in the difference, so
   *  this is the most robust of the four. */
  hipShoulderSeparationDeg: number | null;
  /** Spine (root→neck) tilt from vertical, degrees, sign-normalised by
   *  hand (positive ≈ leaning to the trail side). */
  spineTiltDeg: number | null;
  /** Head displacement from the address baseline, as a percentage of
   *  shoulder width (scale-invariant) — a head-sway magnitude. */
  headDeltaPct: number | null;
}

export interface PoseMetricsOptions {
  /** Right/left-handed golfer — flips the sign conventions so a metric
   *  means the same thing for both hands (non-negotiable per CLAUDE.md). */
  swingHand: SwingHand;
  /** Head position at address (typically the track's first frame), used
   *  for `headDeltaPct`. Omit/null to skip head delta. */
  baselineHead?: Vec2 | null;
}

/**
 * Vector `from`→`to` in aspect-corrected space (units of frame height),
 * so geometric angles are correct on non-square video. A horizontal
 * delta of `dx` spans `dx * width` px = `dx * aspect * height` px, so we
 * scale x by `aspect` to match y's height-relative scale. Aspect 0
 * (unknown) falls back to square.
 */
function correctedVec(from: Vec2, to: Vec2, aspect: number): Vec2 {
  const k = aspect > 0 ? aspect : 1;
  return { x: (to.x - from.x) * k, y: to.y - from.y };
}

function magnitude(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Angle of a vector from the +x (horizontal) axis, degrees. y is down,
 *  so a positive result points downward on screen. */
function angleFromHorizontalDeg(v: Vec2): number {
  return Math.atan2(v.y, v.x) * RAD2DEG;
}

/** Fold an angle into [-90, 90] — a line's *tilt*, independent of which
 *  end we measured from (a shoulder line at 170° and -10° are the same
 *  10° tilt). */
function wrapTo90(deg: number): number {
  let d = deg;
  while (d > 90) d -= 180;
  while (d < -90) d += 180;
  return d;
}

/**
 * Compute the Phase 3.3 metrics for one frame. Pure — same frame + opts
 * always yields the same result; run it over a `PoseTrack` to get a
 * per-frame signal for Phase 4 classification.
 */
export function computePoseMetrics(
  frame: PoseFrame,
  opts: PoseMetricsOptions,
): PoseMetrics {
  const { joints, aspect } = frame;
  // Right-handed golfers turn clockwise (face-on): trail shoulder rises,
  // giving a negative raw tilt — flip so "backswing turn" is positive.
  const handSign = opts.swingHand === 'right' ? -1 : 1;

  const ls = joints.leftShoulder;
  const rs = joints.rightShoulder;
  const lh = joints.leftHip;
  const rh = joints.rightHip;
  const neck = joints.neck;
  const root = joints.root;
  const head = joints.head;

  // Shoulder + hip line tilts from horizontal.
  const shoulderTilt =
    ls && rs
      ? wrapTo90(angleFromHorizontalDeg(correctedVec(ls, rs, aspect)))
      : null;
  const hipTilt =
    lh && rh
      ? wrapTo90(angleFromHorizontalDeg(correctedVec(lh, rh, aspect)))
      : null;

  const shoulderRotationDeg =
    shoulderTilt === null ? null : handSign * shoulderTilt;

  const hipShoulderSeparationDeg =
    shoulderTilt === null || hipTilt === null
      ? null
      : handSign * (shoulderTilt - hipTilt);

  // Spine tilt from vertical-up (root→neck). atan2(vx, -vy) is 0 when the
  // spine points straight up, positive when the neck is right of the root.
  let spineTiltDeg: number | null = null;
  if (root && neck) {
    const v = correctedVec(root, neck, aspect);
    spineTiltDeg = handSign * Math.atan2(v.x, -v.y) * RAD2DEG;
  }

  // Head sway from address, normalised by shoulder width so it's
  // device/zoom-independent.
  let headDeltaPct: number | null = null;
  const baseline = opts.baselineHead;
  if (head && baseline && ls && rs) {
    const shoulderWidth = magnitude(correctedVec(ls, rs, aspect));
    if (shoulderWidth > 0) {
      const moved = magnitude(correctedVec(baseline, head, aspect));
      headDeltaPct = (moved / shoulderWidth) * 100;
    }
  }

  return {
    shoulderRotationDeg,
    hipShoulderSeparationDeg,
    spineTiltDeg,
    headDeltaPct,
  };
}
