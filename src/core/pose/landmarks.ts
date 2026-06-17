/**
 * core/pose/landmarks — Stable joint schema + raw-name mapping
 * The engine (Apple Vision) emits landmarks keyed by its raw rig joint
 * names (e.g. "left_upperArm_1_joint"). This module is the single place
 * that translates those into a stable, engine-agnostic schema
 * (`leftShoulder`, …) so the overlay and the Phase 3.3 metrics never
 * depend on the underlying engine's naming. A MediaPipe swap (§16 Risk
 * 4) only has to add its names to the map below.
 *
 * It also owns the *meaning* layered on top of bare points:
 *   - `SKELETON_BONES` — which joints connect (what the overlay draws)
 *   - `KEY_JOINTS`     — golf-relevant joints highlighted per
 *                        DESIGN_SYSTEM §14 (wrists, hips, shoulders)
 *   - `FACE_JOINTS`    — head landmarks the overlay renders as a single
 *                        translucent head circle rather than dots
 *   - `toPoseFrame()`  — raw landmarks → a confidence-filtered PoseFrame
 *
 * Spec: PROJECT_SPEC.md §22 Phase 3.2.
 */

import type { PoseLandmark } from './types';

/** The stable, engine-agnostic joint names the rest of the app uses. */
export type PoseJoint =
  | 'nose'
  | 'leftEye'
  | 'rightEye'
  | 'leftEar'
  | 'rightEar'
  | 'neck'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftElbow'
  | 'rightElbow'
  | 'leftWrist'
  | 'rightWrist'
  | 'root'
  | 'leftHip'
  | 'rightHip'
  | 'leftKnee'
  | 'rightKnee'
  | 'leftAnkle'
  | 'rightAnkle';

/**
 * Normalised joint-name core → stable joint. Apple Vision's
 * `VNHumanBodyPoseObservationJointName` raw values are rig-style and
 * vary across OS versions in two ways: the body-part token
 * (`upperArm`/`forearm`/`hand`/`upLeg`/`leg`/`foot` vs the plain
 * `shoulder`/`elbow`/`wrist`/`hip`/`knee`/`ankle`) and the suffix
 * (`left_upLeg_1_joint` vs `left_upLeg_joint`). On-device testing showed
 * the exact-string table only matched some joints. We instead normalise
 * each raw name to a `{side}_{part}` core and map that, accepting both
 * token styles — so the overlay surfaces every joint whichever naming
 * the installed OS emits.
 */
const CORE_TO_JOINT: Readonly<Record<string, PoseJoint>> = {
  nose: 'nose',
  left_eye: 'leftEye',
  right_eye: 'rightEye',
  left_ear: 'leftEar',
  right_ear: 'rightEar',
  neck: 'neck',
  root: 'root',
  // shoulders (rig token: upperArm)
  left_shoulder: 'leftShoulder',
  left_upperarm: 'leftShoulder',
  right_shoulder: 'rightShoulder',
  right_upperarm: 'rightShoulder',
  // elbows (rig token: forearm)
  left_elbow: 'leftElbow',
  left_forearm: 'leftElbow',
  right_elbow: 'rightElbow',
  right_forearm: 'rightElbow',
  // wrists (rig token: hand)
  left_wrist: 'leftWrist',
  left_hand: 'leftWrist',
  right_wrist: 'rightWrist',
  right_hand: 'rightWrist',
  // hips (rig token: upLeg)
  left_hip: 'leftHip',
  left_upleg: 'leftHip',
  right_hip: 'rightHip',
  right_upleg: 'rightHip',
  // knees (rig token: leg)
  left_knee: 'leftKnee',
  left_leg: 'leftKnee',
  right_knee: 'rightKnee',
  right_leg: 'rightKnee',
  // ankles (rig token: foot)
  left_ankle: 'leftAnkle',
  left_foot: 'leftAnkle',
  right_ankle: 'rightAnkle',
  right_foot: 'rightAnkle',
};

/**
 * Reduce a raw Vision joint name to its `{side}_{part}` core: lowercase,
 * drop the trailing `_joint`, then any trailing `_<digits>`. Returns the
 * stable joint, or null when nothing matches.
 *   "left_forearm_1_joint" → "left_forearm" → leftElbow
 *   "right_upLeg_joint"    → "right_upleg"  → rightHip
 *   "neck_1_joint"         → "neck"         → neck
 */
export function normalizeJointName(raw: string): PoseJoint | null {
  const core = raw
    .toLowerCase()
    .replace(/_joint$/, '')
    .replace(/_\d+$/, '');
  return CORE_TO_JOINT[core] ?? null;
}

/**
 * The bones the overlay draws, as joint pairs. Order doesn't matter; a
 * bone only renders when both endpoints are present in the frame.
 */
export const SKELETON_BONES: readonly (readonly [PoseJoint, PoseJoint])[] = [
  ['neck', 'nose'],
  ['leftShoulder', 'rightShoulder'],
  ['neck', 'leftShoulder'],
  ['neck', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['neck', 'root'],
  ['root', 'leftHip'],
  ['root', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
] as const;

/**
 * Golf-relevant joints the overlay highlights larger + brighter
 * (DESIGN_SYSTEM §14): wrists, hips, shoulders.
 */
export const KEY_JOINTS: ReadonlySet<PoseJoint> = new Set<PoseJoint>([
  'leftShoulder',
  'rightShoulder',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
]);

/**
 * Head landmarks. The overlay draws a single translucent head circle
 * (anchored on `nose`) instead of individual face dots — DESIGN_SYSTEM
 * §14 keeps non-golf-relevant face landmarks de-emphasised.
 */
export const FACE_JOINTS: ReadonlySet<PoseJoint> = new Set<PoseJoint>([
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
]);

/** Vision noise floor — points below this confidence are dropped.
 *  Undetected joints come back at ~0 confidence; a low floor keeps the
 *  occluded-but-real limbs (often 0.1–0.4) while dropping the garbage. */
export const MIN_JOINT_CONFIDENCE = 0.05;

/** A single mapped, projected-ready joint point. */
export interface PoseJointPoint {
  joint: PoseJoint;
  /** Normalised [0,1] coordinate within the source frame, origin top-left. */
  x: number;
  y: number;
  /** Detection confidence [0,1]. */
  confidence: number;
}

/** A detected pose for one frame, ready for the overlay to render. */
export interface PoseFrame {
  /** Present joints keyed by stable name (low-confidence ones dropped). */
  joints: Partial<Record<PoseJoint, PoseJointPoint>>;
  /** Source-frame aspect ratio (width / height) for letterbox projection. */
  aspect: number;
}

/**
 * Map raw engine landmarks into a stable `PoseFrame`. Unknown joint
 * names and points below `MIN_JOINT_CONFIDENCE` are dropped. `aspect`
 * is the upright source-frame width/height the engine reported.
 */
export function toPoseFrame(
  raw: PoseLandmark[],
  aspect: number,
): PoseFrame {
  const joints: Partial<Record<PoseJoint, PoseJointPoint>> = {};

  for (const landmark of raw) {
    const joint = normalizeJointName(landmark.name);
    if (!joint) {
      if (__DEV__) {
        console.warn(`[pose] unmapped joint name: ${landmark.name}`);
      }
      continue;
    }
    if (landmark.visibility < MIN_JOINT_CONFIDENCE) continue;

    joints[joint] = {
      joint,
      x: landmark.x,
      y: landmark.y,
      confidence: landmark.visibility,
    };
  }

  return {
    joints,
    aspect: Number.isFinite(aspect) && aspect > 0 ? aspect : 0,
  };
}
