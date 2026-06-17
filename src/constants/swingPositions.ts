/**
 * swingPositions — Constant
 * The 8 canonical positions in a golf swing, in temporal order. Used by the
 * frame extractor (Phase 4.2) to label the 8 frames sent to Claude Vision —
 * the array index IS the Claude `frame_index` (0–7).
 *
 * The `detection` signals below are written for a right-handed golfer
 * (matching PROJECT_SPEC.md §14). At runtime the frame extractor mirrors
 * them for left-handed golfers from the video's `swingHand` metadata, so all
 * directional swing language respects handedness (CLAUDE.md non-negotiable).
 *
 * `fallbackFraction` is the position's share of clip duration for the
 * no-pose fallback (the spec's 10/20/30/45/55/65/75/90% schedule) — used
 * when the pose engine is unavailable, e.g. on the iOS Simulator where
 * Vision body pose can't run.
 *
 * Source of truth: PROJECT_SPEC.md §14 Frame extraction strategy
 */

export const SWING_POSITIONS = [
  {
    index: 0,
    id: 'address',
    name: 'Address',
    detection: 'Wrists at hip height, minimal shoulder rotation',
    fallbackFraction: 0.1,
  },
  {
    index: 1,
    id: 'takeaway',
    name: 'Takeaway',
    detection: 'Right wrist rising, club parallel to ground',
    fallbackFraction: 0.2,
  },
  {
    index: 2,
    id: 'halfwayBack',
    name: 'Halfway back',
    detection: 'Left arm parallel to ground',
    fallbackFraction: 0.3,
  },
  {
    index: 3,
    id: 'top',
    name: 'Top',
    detection: 'Max shoulder rotation, wrists highest point',
    fallbackFraction: 0.45,
  },
  {
    index: 4,
    id: 'transition',
    name: 'Transition',
    detection: 'Shoulder rotation beginning to decrease',
    fallbackFraction: 0.55,
  },
  {
    index: 5,
    id: 'halfwayDown',
    name: 'Halfway down',
    detection: 'Left arm parallel (downswing)',
    fallbackFraction: 0.65,
  },
  {
    index: 6,
    id: 'impact',
    name: 'Impact',
    detection: 'Wrists lowest, hips most open',
    fallbackFraction: 0.75,
  },
  {
    index: 7,
    id: 'finish',
    name: 'Finish',
    detection: 'Weight on lead foot',
    fallbackFraction: 0.9,
  },
] as const;

export const SWING_POSITION_COUNT = SWING_POSITIONS.length;

export type SwingPosition = (typeof SWING_POSITIONS)[number];
export type SwingPositionName = SwingPosition['name'];
export type SwingPositionId = SwingPosition['id'];
