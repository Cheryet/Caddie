/**
 * core/pose — Barrel export
 * Public surface for the pose abstraction. Importers outside this
 * folder should only reach for these symbols; the underlying
 * `caddie-pose` engine package is intentionally hidden (§16 Risk 4).
 */

export {
  detectPose,
  detectPoseFrame,
  getPoseError,
  getPoseStatus,
  initPose,
  isPoseReady,
  subscribePoseStatus,
} from './client';
export {
  FACE_JOINTS,
  KEY_JOINTS,
  MIN_JOINT_CONFIDENCE,
  SKELETON_BONES,
  toPoseFrame,
} from './landmarks';
export type {
  PoseFrame,
  PoseJoint,
  PoseJointPoint,
} from './landmarks';
export type {
  PoseFrameResult,
  PoseInitError,
  PoseLandmark,
  PoseStatus,
} from './types';
