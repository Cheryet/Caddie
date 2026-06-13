/**
 * swingPositions — Constant
 * The 8 canonical positions in a golf swing, in temporal order. Used by the
 * frame extractor (Phase 4.2) to label the 8 frames sent to Claude Vision.
 *
 * The detection signals below are written for a right-handed golfer (matching
 * PROJECT_SPEC.md §14). At runtime, the frame extractor mirrors these for
 * left-handed golfers based on the video's swing_hand metadata.
 *
 * Source of truth: PROJECT_SPEC.md §14 Frame extraction strategy
 */

export const SWING_POSITIONS = [
  {
    index: 0,
    name: 'Address',
    detection: 'Wrists at hip height, minimal shoulder rotation',
  },
  {
    index: 1,
    name: 'Takeaway',
    detection: 'Right wrist rising, club parallel to ground',
  },
  {
    index: 2,
    name: 'Halfway back',
    detection: 'Left arm parallel to ground',
  },
  {
    index: 3,
    name: 'Top',
    detection: 'Max shoulder rotation, wrists highest point',
  },
  {
    index: 4,
    name: 'Transition',
    detection: 'Shoulder rotation beginning to decrease',
  },
  {
    index: 5,
    name: 'Halfway down',
    detection: 'Left arm parallel (downswing)',
  },
  {
    index: 6,
    name: 'Impact',
    detection: 'Wrists lowest, hips most open',
  },
  {
    index: 7,
    name: 'Finish',
    detection: 'Weight on lead foot',
  },
] as const;

export const SWING_POSITION_COUNT = SWING_POSITIONS.length;

export type SwingPosition = (typeof SWING_POSITIONS)[number];
export type SwingPositionName = SwingPosition['name'];
