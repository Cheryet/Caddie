/**
 * core/pose/types — Pose abstraction types
 * Internal to `src/core/pose/`. The rest of the app imports these
 * via the feature-level barrel so the underlying engine can be
 * swapped without rippling.
 *
 * `PoseLandmark` is re-exported from the local `caddie-pose`
 * package — the engine layer owns the canonical landmark shape so
 * a future engine swap (MediaPipe direct bridge, etc.) only has to
 * update that package's `src/types.ts`.
 *
 * PROJECT_SPEC.md §16 Risk 4 lays out the deliberate hedge.
 */

export type PoseStatus = 'idle' | 'loading' | 'ready' | 'failed';

export type { PoseFrameResult, PoseLandmark } from 'caddie-pose';

export interface PoseInitError {
  code: 'package_unavailable' | 'model_load_failed' | 'unknown';
  message: string;
}
