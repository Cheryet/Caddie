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

/**
 * Result of `detectOnVideoFrame`. Carries the upright source-frame
 * pixel dimensions alongside the landmarks so the overlay can project
 * the normalised coords into the `resizeMode="contain"` letterbox
 * without guessing the video's display orientation — the bridge
 * already applied the preferred track transform, so `width`/`height`
 * describe exactly the image Vision analysed.
 */
export interface PoseFrameResult {
  /** Upright source-frame width in pixels. */
  width: number;
  /** Upright source-frame height in pixels. */
  height: number;
  /** Detected landmarks, normalised to the upright frame. */
  landmarks: PoseLandmark[];
}

/**
 * One sampled frame from `detectPosesForVideo`. Like `PoseFrameResult`
 * but tagged with its timestamp so the JS side can build a time-indexed
 * track and look up the pose for any playback position.
 */
export interface PoseVideoFrame {
  /** Sample timestamp in milliseconds from the start of the clip. */
  timeMs: number;
  /** Upright source-frame width in pixels. */
  width: number;
  /** Upright source-frame height in pixels. */
  height: number;
  /** Detected landmarks, normalised to the upright frame. */
  landmarks: PoseLandmark[];
}
