/**
 * core/pose/client — Pose abstraction
 * The deliberate hedge from PROJECT_SPEC.md §16 Risk 4: the rest of
 * the app talks to this module's API and nothing else. The current
 * implementation lives in the local `caddie-pose` package, which
 * wraps Apple's Vision framework (`VNDetectHumanBodyPoseRequest`)
 * via a thin Objective-C native bridge.
 *
 * Why Apple Vision instead of MediaPipe:
 *   - `react-native-mediapipe@0.6.0` targets Vision Camera 4's
 *     plugin headers; we're on VC5 which moved them. Install
 *     failed with `'VisionCamera/FrameProcessorPlugin.h' file not
 *     found`. The community package would need to be patched +
 *     maintained as a fork.
 *   - Our use case is per-frame inference on a *recorded* video
 *     (Phase 3.2: "Run Pose Landmarker on current frame as user
 *     scrubs"), not live-camera processing. The community
 *     package's frame-processor architecture isn't what we need.
 *   - Apple Vision: 19 body landmarks (every joint the spec's
 *     §22 Phase 3.3 metrics need — shoulders, hips, spine, head),
 *     0 MB binary cost, zero third-party risk, ships today.
 *
 * If we ever want MediaPipe specifically, only the `caddie-pose`
 * package implementation changes — the abstraction here stays.
 *
 * Phase 3.1 scope:
 *   - `initPose()`         — verify the native bridge is registered,
 *                            the OS supports Vision (iOS 14+), and
 *                            body-pose detection can actually run (a
 *                            capability probe — it fails on the iOS
 *                            Simulator, so the UI hides pose there).
 *   - `subscribePoseStatus` — pub/sub for the loading → ready/failed
 *                            transition. Mirrors the Toast singleton.
 *   - `detectPose(path)`   — proxied to caddie-pose. Phase 3.2's
 *                            overlay calls it per-frame; the API is
 *                            already wired so 3.2 lands without
 *                            touching this file.
 */

import type {
  PoseFrameResult,
  PoseInitError,
  PoseLandmark,
  PoseStatus,
  PoseVideoFrame,
} from './types';

type Listener = (status: PoseStatus, error: PoseInitError | null) => void;

/**
 * The shape the loader returns. `caddie-pose` exports `initialize`,
 * `detectOnImage`, and `detectOnVideoFrame`; tests inject a mock that
 * implements them. Keeping them on a single object so init can cache
 * the detect references for later use.
 */
export interface PoseModule {
  initialize(): Promise<void>;
  detectOnImage(imagePath: string): Promise<PoseLandmark[]>;
  detectOnVideoFrame(
    videoPath: string,
    timeMs: number,
  ): Promise<PoseFrameResult>;
  detectPosesForVideo(
    videoPath: string,
    fps: number,
  ): Promise<PoseVideoFrame[]>;
  extractJpegFrames(
    videoPath: string,
    timesMs: number[],
    maxSize: number,
    quality: number,
  ): Promise<string[]>;
}

// Module-level state — single source of truth for the pose status.
// Living outside React so non-component callers (e.g. analytics
// later) can also subscribe.
let currentStatus: PoseStatus = 'idle';
let currentError: PoseInitError | null = null;
let activeModule: PoseModule | null = null;
const listeners = new Set<Listener>();

function setStatus(next: PoseStatus, error: PoseInitError | null = null): void {
  currentStatus = next;
  currentError = error;
  listeners.forEach(l => l(next, error));
}

export function getPoseStatus(): PoseStatus {
  return currentStatus;
}

export function getPoseError(): PoseInitError | null {
  return currentError;
}

export function isPoseReady(): boolean {
  return currentStatus === 'ready';
}

/**
 * Subscribe to pose-status changes. Returns an unsubscribe function.
 * The listener is NOT invoked synchronously with the current value —
 * read `getPoseStatus()` if the caller needs the initial state.
 */
export function subscribePoseStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Default loader — pulls the `caddie-pose` native bridge. Lazy
 * `require` so a missing native side (e.g. on first install before
 * `pod install` ran) lands cleanly in initPose's try/catch as a
 * `package_unavailable` failure instead of a bundle crash.
 */
function defaultLoader(): PoseModule {
  return require('caddie-pose') as PoseModule;
}

/**
 * Kick off pose initialisation. Safe to call multiple times — a
 * second call while a previous init is loading or ready is a no-op.
 * After a `failed` status, calling again retries (so a future
 * "retry" affordance can re-run).
 *
 * The `loader` parameter is for tests; production callers leave it
 * unset.
 */
export async function initPose(
  loader: () => PoseModule = defaultLoader,
): Promise<void> {
  if (currentStatus === 'loading' || currentStatus === 'ready') return;

  setStatus('loading');

  try {
    const mod = loader();
    await mod.initialize();
    activeModule = mod;
    setStatus('ready');
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error initializing pose.';
    const code: PoseInitError['code'] = /not found|not registered|unsupported/i.test(
      message,
    )
      ? 'package_unavailable'
      : 'unknown';
    setStatus('failed', { code, message });
    activeModule = null;
    if (__DEV__) {
      console.warn('[pose] init failed:', message);
    }
  }
}

/**
 * Run pose detection on the image at `imagePath`. Returns the raw
 * landmark array from the active engine — Phase 3.2 layers a
 * stable schema on top via `src/core/pose/landmarks.ts`.
 *
 * Throws when the engine isn't ready. Callers should gate on
 * `isPoseReady()` or `usePoseStatus()` before invoking.
 */
export async function detectPose(imagePath: string): Promise<PoseLandmark[]> {
  if (!activeModule) {
    throw new Error('Pose engine not ready — check isPoseReady() first');
  }
  return activeModule.detectOnImage(imagePath);
}

/**
 * Detect the body pose on the frame at `timeMs` of the video at
 * `videoUri` (a local `file://` path or a remote URL). Phase 3.2's
 * overlay calls this per-frame as the user scrubs. Returns the upright
 * frame dimensions alongside the raw landmarks — `landmarks.ts`'s
 * `toPoseFrame` maps them to the stable schema.
 *
 * Throws when the engine isn't ready. Callers should gate on
 * `isPoseReady()` or `usePoseStatus()` before invoking.
 */
export async function detectPoseFrame(
  videoUri: string,
  timeMs: number,
): Promise<PoseFrameResult> {
  if (!activeModule) {
    throw new Error('Pose engine not ready — check isPoseReady() first');
  }
  return activeModule.detectOnVideoFrame(videoUri, timeMs);
}

/**
 * Pre-compute body pose across the whole video at `fps` samples/second.
 * The heavy lifting (one-time download + batch frame extraction + Vision
 * per frame) runs natively; this returns the raw per-sample frames which
 * `buildPoseTrack` turns into a time-indexed, lookup-ready track.
 *
 * Throws when the engine isn't ready — gate on `isPoseReady()` first.
 */
export async function precomputePoses(
  videoUri: string,
  fps: number,
): Promise<PoseVideoFrame[]> {
  if (!activeModule) {
    throw new Error('Pose engine not ready — check isPoseReady() first');
  }
  return activeModule.detectPosesForVideo(videoUri, fps);
}

/**
 * Extract the frames at `timesMs` from the video as base64 JPEGs (one per
 * timestamp, same order), each capped to `maxSize` px on the long side at
 * `quality` (0–100). The frame extractor (Phase 4.2) uses this to build the
 * Claude Vision payload.
 *
 * Unlike the pose calls this only decodes pixels — it does NOT need Vision,
 * so it intentionally does NOT gate on the engine being `ready`: it must
 * still work when pose init failed (the iOS Simulator, or any device where
 * the Vision probe fails) so the no-pose fallback path can extract frames.
 * It only needs the native module present; reuse the already-loaded module
 * when there is one, otherwise load it now. The package wrapper throws
 * cleanly if the native side is genuinely absent.
 *
 * `loader` is injectable for tests; production callers leave it unset.
 */
export async function extractFrameJpegs(
  videoUri: string,
  timesMs: number[],
  maxSize: number,
  quality: number,
  loader: () => PoseModule = defaultLoader,
): Promise<string[]> {
  const mod = activeModule ?? loader();
  return mod.extractJpegFrames(videoUri, timesMs, maxSize, quality);
}

/**
 * Test helper: reset the singleton state. Not exported from the
 * public barrel — only `__tests__` reaches in.
 */
export function __resetPoseClientForTests(): void {
  currentStatus = 'idle';
  currentError = null;
  activeModule = null;
  listeners.clear();
}
