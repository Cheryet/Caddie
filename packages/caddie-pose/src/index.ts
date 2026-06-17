/**
 * caddie-pose — Public surface
 * Thin wrapper around the `CaddiePose` native module. Exists as its
 * own RN package so the app can autolink the iOS pod without
 * touching the main Caddie target's pbxproj.
 *
 * Consumed by `src/core/pose/client.ts`, which is the only file
 * outside this package that should import from here — the rest of
 * the app talks to `@/core/pose` (the abstraction layer per
 * PROJECT_SPEC.md §16 Risk 4).
 */

import { NativeModules } from 'react-native';

import type { PoseFrameResult, PoseLandmark } from './types';

interface CaddiePoseNativeModule {
  initialize(): Promise<boolean>;
  detectOnImage(imagePath: string): Promise<PoseLandmark[]>;
  detectOnVideoFrame(
    videoPath: string,
    timeMs: number,
  ): Promise<PoseFrameResult>;
}

const native = (NativeModules as { CaddiePose?: CaddiePoseNativeModule })
  .CaddiePose;

export { type PoseFrameResult, type PoseLandmark } from './types';

/**
 * Verify the native module is registered, the OS supports Vision, AND
 * body-pose detection can actually run here (a capability probe — it
 * can't be set up on the iOS Simulator). Rejects when pose is
 * unavailable so callers can disable the feature.
 */
export async function initialize(): Promise<void> {
  if (!native) {
    throw new Error(
      'CaddiePose native module not found — did pod install run after package install?',
    );
  }
  await native.initialize();
}

/** Run pose detection on a JPEG/PNG at the given local file path. */
export async function detectOnImage(
  imagePath: string,
): Promise<PoseLandmark[]> {
  if (!native) {
    throw new Error('CaddiePose native module not found');
  }
  return native.detectOnImage(imagePath);
}

/**
 * Extract the frame at `timeMs` from the video at `videoPath` (a local
 * `file://` path or a remote URL) and run pose detection on it. Used by
 * the playback overlay to detect the body on the frame the user is
 * scrubbing to. Returns the upright frame dimensions alongside the
 * landmarks.
 */
export async function detectOnVideoFrame(
  videoPath: string,
  timeMs: number,
): Promise<PoseFrameResult> {
  if (!native) {
    throw new Error('CaddiePose native module not found');
  }
  return native.detectOnVideoFrame(videoPath, timeMs);
}
