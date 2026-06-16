/**
 * caddie-pose/types — Public landmark types
 * Mirrors the shape returned by the native bridge. The `name` field
 * uses Apple Vision's `VNHumanBodyPoseObservationJointName` raw
 * value strings (e.g. "left_shoulder_1_joint", "nose_1_joint").
 * The JS side maps these to a stable schema before consumers see
 * them — see `src/core/pose/landmarks.ts` (added in Phase 3.2).
 */

export interface PoseLandmark {
  /** Vision joint name (raw value). */
  name: string;
  /** Normalised [0,1] horizontal coordinate, origin top-left. */
  x: number;
  /** Normalised [0,1] vertical coordinate, origin top-left. */
  y: number;
  /** Always 0 for Vision (2D); reserved for future 3D engines. */
  z: number;
  /** Detection confidence [0,1]; landmarks below ~0.5 are noisy. */
  visibility: number;
}
