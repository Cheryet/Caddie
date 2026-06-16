/**
 * core/pose — Barrel export
 * Public surface for the pose abstraction. Importers outside this
 * folder should only reach for these symbols; the underlying
 * `react-native-mediapipe` package is intentionally hidden.
 */

export {
  getPoseError,
  getPoseStatus,
  initPose,
  isPoseReady,
  subscribePoseStatus,
} from './client';
export type { PoseInitError, PoseLandmark, PoseStatus } from './types';
