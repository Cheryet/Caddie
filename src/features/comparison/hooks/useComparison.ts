/**
 * useComparison — Feature hook
 * Orchestrates the two-up comparison: owns the two slot ids + the picker
 * state (which slot is being chosen), holds a <VideoPlayer> ref per panel,
 * and composes useComparePanel ×2 (wiring each panel's seek to its ref).
 *
 * Sync (5.1b): once both panels have an impact frame marked, Sync couples the
 * two timelines by their impact offset — scrubbing one drives the other to the
 * same point relative to impact, and play/pause is shared. Each panel keeps
 * its own speed (per the Design note), so simultaneous play at differing
 * speeds can drift after impact; at the shared 0.5× default they stay aligned.
 *
 * The session is ephemeral — slot ids live only in local state (PROJECT_SPEC
 * §22 5.1 "Sessions ephemeral"). Optionally seeded from the route so a future
 * "Compare with…" entry can pre-fill a side.
 *
 * Used by: ComparisonScreen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { VideoPlayerHandle } from '@/features/playback/components/VideoPlayer';
import { useComparePanel } from '@/features/comparison/hooks/useComparePanel';
import type { ComparePanelState } from '@/features/comparison/types';

export type CompareSlot = 'A' | 'B';

export interface UseComparisonArgs {
  initialVideoIdA?: string;
  initialVideoIdB?: string;
}

export interface UseComparisonReturn {
  panelA: ComparePanelState;
  panelB: ComparePanelState;
  // RefObject<… | null> matches what useRef<T>(null) returns under React 19;
  // it's still a valid Ref<VideoPlayerHandle> for the <VideoPlayer>.
  playerRefA: React.RefObject<VideoPlayerHandle | null>;
  playerRefB: React.RefObject<VideoPlayerHandle | null>;
  /** Which slot's picker is open, or null. */
  pickerOpenFor: CompareSlot | null;
  openPicker: (slot: CompareSlot) => void;
  closePicker: () => void;
  /** Fill the slot whose picker is open, then close it. */
  chooseVideo: (videoId: string) => void;
  // ── Sync (5.1b) ──
  /** Whether the two timelines are locked to their impact frames. */
  syncOn: boolean;
  /** Both panels have an impact marked — Sync can be turned on. */
  canSync: boolean;
  toggleSync: () => void;
}

export function useComparison({
  initialVideoIdA = undefined,
  initialVideoIdB = undefined,
}: UseComparisonArgs = {}): UseComparisonReturn {
  const [videoIdA, setVideoIdA] = useState<string | null>(initialVideoIdA ?? null);
  const [videoIdB, setVideoIdB] = useState<string | null>(initialVideoIdB ?? null);
  const [pickerOpenFor, setPickerOpenFor] = useState<CompareSlot | null>(null);

  const playerRefA = useRef<VideoPlayerHandle>(null);
  const playerRefB = useRef<VideoPlayerHandle>(null);

  const onSeekA = useCallback((seconds: number) => {
    playerRefA.current?.seek(seconds);
  }, []);
  const onSeekB = useCallback((seconds: number) => {
    playerRefB.current?.seek(seconds);
  }, []);

  const panelA = useComparePanel({ videoId: videoIdA, onSeek: onSeekA });
  const panelB = useComparePanel({ videoId: videoIdB, onSeek: onSeekB });

  const openPicker = useCallback((slot: CompareSlot) => {
    setPickerOpenFor(slot);
  }, []);

  const closePicker = useCallback(() => {
    setPickerOpenFor(null);
  }, []);

  const chooseVideo = useCallback(
    (videoId: string) => {
      if (pickerOpenFor === 'A') setVideoIdA(videoId);
      else if (pickerOpenFor === 'B') setVideoIdB(videoId);
      setPickerOpenFor(null);
    },
    [pickerOpenFor],
  );

  // ─── Sync ──────────────────────────────────────────────────────────────
  const [syncOn, setSyncOn] = useState(false);
  const canSync = panelA.impactMs !== null && panelB.impactMs !== null;

  // Drop sync if a panel loses its impact (e.g. its video was swapped).
  useEffect(() => {
    if (syncOn && !canSync) setSyncOn(false);
  }, [syncOn, canSync]);

  const toggleSync = useCallback(() => {
    if (syncOn) {
      setSyncOn(false);
      return;
    }
    if (panelA.impactMs === null || panelB.impactMs === null) return;
    // Lock B onto A at the impact offset so they start aligned.
    panelB.seekMs(panelA.currentMs + (panelB.impactMs - panelA.impactMs));
    setSyncOn(true);
  }, [syncOn, panelA, panelB]);

  // When synced, scrubbing one panel drives the other to the same point
  // relative to impact; the follower's own seekMs clamps to its duration.
  const seekSlot = (slot: CompareSlot, ms: number) => {
    if (slot === 'A') {
      panelA.seekMs(ms);
      if (syncOn && panelA.impactMs !== null && panelB.impactMs !== null) {
        panelB.seekMs(ms + (panelB.impactMs - panelA.impactMs));
      }
    } else {
      panelB.seekMs(ms);
      if (syncOn && panelA.impactMs !== null && panelB.impactMs !== null) {
        panelA.seekMs(ms + (panelA.impactMs - panelB.impactMs));
      }
    }
  };

  // When synced, play/pause is shared; otherwise each panel toggles itself.
  const toggleSlot = (slot: CompareSlot) => {
    if (!syncOn) {
      (slot === 'A' ? panelA : panelB).toggle();
      return;
    }
    const next = !(slot === 'A' ? panelA.isPlaying : panelB.isPlaying);
    if (next) {
      panelA.play();
      panelB.play();
    } else {
      panelA.pause();
      panelB.pause();
    }
  };

  // Override only seek + toggle so ComparePanel's existing wiring is untouched.
  const composedA: ComparePanelState = {
    ...panelA,
    seekMs: ms => seekSlot('A', ms),
    toggle: () => toggleSlot('A'),
  };
  const composedB: ComparePanelState = {
    ...panelB,
    seekMs: ms => seekSlot('B', ms),
    toggle: () => toggleSlot('B'),
  };

  return {
    panelA: composedA,
    panelB: composedB,
    playerRefA,
    playerRefB,
    pickerOpenFor,
    openPicker,
    closePicker,
    chooseVideo,
    syncOn,
    canSync,
    toggleSync,
  };
}
