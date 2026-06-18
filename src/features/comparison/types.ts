/**
 * comparison/types — Shared types
 * The per-panel state shape + rate constants, kept free of any service
 * imports so the presentational components (ComparePanel, ComparisonPlayer)
 * depend on this rather than on useComparePanel (which pulls in Supabase).
 *
 * Part of: src/features/comparison/
 */

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
}
