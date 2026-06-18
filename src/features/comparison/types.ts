/**
 * comparison/types — Shared types
 * The per-panel state shape + rate constants, kept free of any service
 * imports so the presentational components (ComparePanel, ComparisonPlayer)
 * depend on this rather than on useComparePanel (which pulls in Supabase).
 *
 * The pose types below are `import type` only — they emit no runtime import,
 * so the presentational layer stays free of the pose engine + Supabase.
 *
 * Part of: src/features/comparison/
 */

import type { PoseFrame } from '@/core/pose';
import type { PoseTrackStatus } from '@/features/pose/hooks/usePoseTrack';

export type CompareRate = 0.5 | 1;
export const COMPARE_RATES: readonly CompareRate[] = [0.5, 1] as const;

export type ComparePanelStatus = 'empty' | 'loading' | 'ready' | 'error';

export interface ComparePanelState {
  videoId: string | null;
  status: ComparePanelStatus;
  uri: string | null;
  /** "Driver · Today" — null until the row loads. */
  label: string | null;
  // ── Playback ──
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  rate: CompareRate;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Seek to an absolute ms position (clamped). Seeks the player + state. */
  seekMs: (ms: number) => void;
  setRate: (rate: CompareRate) => void;
  // ── Driven by the <VideoPlayer> ──
  setProgress: (ms: number) => void;
  setDuration: (ms: number) => void;
  onEnd: () => void;
  // ── Impact frame (5.1b) ──
  /** Marked impact position in ms, or null when unmarked. Drives the amber
   *  tick + the offset that Sync aligns the two timelines to. */
  impactMs: number | null;
  /** Mark the current frame as this panel's impact (no-op until ready). */
  markImpact: () => void;
  // ── Per-panel pose overlay (5.1b) ──
  /** On-device engine is ready — gates the toggle's visibility. */
  poseAvailable: boolean;
  poseEnabled: boolean;
  togglePose: () => void;
  /** Pose for the current frame; null when off / not ready / no detection. */
  poseFrame: PoseFrame | null;
  /** Drives the "Analyzing pose…" indicator + the 30fps progress bump. */
  poseTrackStatus: PoseTrackStatus;
  poseElapsedSec: number;
}
