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
 * Raw engine joint-name → stable joint. Apple Vision's
 * `VNHumanBodyPoseObservationJointName` raw values use rig-style names
 * (`left_upperArm_1_joint` for the shoulder, etc.). We map those, and
 * also alias the simpler `left_shoulder_1_joint` form the bridge's
 * original comment assumed — so the overlay works whichever naming the
 * installed OS / engine emits. Unknown names are ignored (with a
 * `__DEV__` warning) by `toPoseFrame`.
 */
const RAW_NAME_TO_JOINT: Readonly<Record<string, PoseJoint>> = {
  // Apple Vision rig-style raw values (what the device emits).
  nose_1_joint: 'nose',
  left_eye_1_joint: 'leftEye',
  right_eye_1_joint: 'rightEye',
  left_ear_1_joint: 'leftEar',
  right_ear_1_joint: 'rightEar',
  neck_1_joint: 'neck',
  left_upperArm_1_joint: 'leftShoulder',
  right_upperArm_1_joint: 'rightShoulder',
  left_forearm_1_joint: 'leftElbow',
  right_forearm_1_joint: 'rightElbow',
  left_hand_1_joint: 'leftWrist',
  right_hand_1_joint: 'rightWrist',
  root: 'root',
  left_upLeg_1_joint: 'leftHip',
  right_upLeg_1_joint: 'rightHip',
  left_leg_1_joint: 'leftKnee',
  right_leg_1_joint: 'rightKnee',
  left_foot_1_joint: 'leftAnkle',
  right_foot_1_joint: 'rightAnkle',
  // Defensive aliases — the simpler semantic names, in case an OS
  // version or a future engine emits these instead.
  left_shoulder_1_joint: 'leftShoulder',
  right_shoulder_1_joint: 'rightShoulder',
  left_elbow_1_joint: 'leftElbow',
  right_elbow_1_joint: 'rightElbow',
  left_wrist_1_joint: 'leftWrist',
  right_wrist_1_joint: 'rightWrist',
  left_hip_1_joint: 'leftHip',
  right_hip_1_joint: 'rightHip',
  left_knee_1_joint: 'leftKnee',
  right_knee_1_joint: 'rightKnee',
  left_ankle_1_joint: 'leftAnkle',
  right_ankle_1_joint: 'rightAnkle',
};

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

/** Vision noise floor — points below this confidence are dropped. */
export const MIN_JOINT_CONFIDENCE = 0.1;

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
    const joint = RAW_NAME_TO_JOINT[landmark.name];
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
