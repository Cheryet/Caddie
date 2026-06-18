/**
 * useComparison — Feature hook
 * Orchestrates the two-up comparison: owns the two slot ids + the picker
 * state (which slot is being chosen), holds a <VideoPlayer> ref per panel,
 * and composes useComparePanel ×2 (wiring each panel's seek to its ref).
 *
 * The session is ephemeral — slot ids live only in local state (PROJECT_SPEC
 * §22 5.1 "Sessions ephemeral"). Optionally seeded from the route so a future
 * "Compare with…" entry can pre-fill a side.
 *
 * Used by: ComparisonScreen.
 */

import { useCallback, useRef, useState } from 'react';

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

  return {
    panelA,
    panelB,
    playerRefA,
    playerRefB,
    pickerOpenFor,
    openPicker,
    closePicker,
    chooseVideo,
  };
}
