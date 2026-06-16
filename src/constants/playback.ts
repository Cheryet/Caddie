/**
 * playback — Constants
 * Tunables for the playback surface. Lifted out of `usePlayback.ts` so
 * tests + components can reference the same values.
 *
 * `FRAME_STEP_MS` assumes 30fps source video. Vision Camera records at
 * 1920×1080@30 by default (Phase 1.3), and our upload pipeline
 * compresses without changing fps. When `react-native-video` exposes
 * the loaded asset's frameRate via `onLoad`, this becomes a derived
 * value — see TODO.md.
 */

/** Approx one frame at 30fps. */
export const FRAME_STEP_MS = 1000 / 30;
