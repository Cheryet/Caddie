/**
 * camera — Constant
 * Shared types and defaults for the swing-capture flow. Kept separate
 * from `clubs.ts` so each constant module stays focused.
 *
 * Source of truth: PROJECT_SPEC.md §4 (MVP video capture).
 */

/** The two valid framings for a swing video. Saved to video metadata. */
export type CameraAngle = 'face-on' | 'dtl';

/**
 * Right- or left-handed golfer. Drives pose-model mirroring and the
 * directional language Claude produces (CLAUDE.md non-negotiable —
 * "All directional swing language must respect swingHand").
 */
export type SwingHand = 'right' | 'left';

export const DEFAULT_CAMERA_ANGLE: CameraAngle = 'face-on';
export const DEFAULT_SWING_HAND: SwingHand = 'right';

/**
 * Countdown shown before recording starts. Toggleable per
 * PROJECT_SPEC.md §4 line 64. The hard cap on recording length lives in
 * `src/constants/config.ts` as MAX_RECORDING_DURATION_SEC.
 */
export const COUNTDOWN_DURATION_SEC = 3;
