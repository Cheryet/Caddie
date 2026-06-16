/**
 * usePlayback — Feature hook
 * Owns the local UI state for the playback surface: play/pause, the
 * current playback rate, the current frame position (driven by the
 * underlying player via `setProgress`/`setDuration`), and the
 * auto-hide chrome timer.
 *
 * The hook is intentionally framework-agnostic — it doesn't import
 * `react-native-video`. The screen wires a ref into <Video> and
 * forwards `seek` / `play` / `pause` to the hook via the imperative
 * controls returned here. This keeps the player swap-able in the
 * future without rewriting the state machine.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { FRAME_STEP_MS } from '@/constants/playback';

export type PlaybackRate = 0.25 | 0.5 | 1;

export const PLAYBACK_RATES: readonly PlaybackRate[] = [0.25, 0.5, 1] as const;

interface UsePlaybackArgs {
  /** Seek the underlying player. Called by step / scrub handlers. */
  onSeek: (timeSec: number) => void;
}

interface UsePlaybackReturn {
  isPlaying: boolean;
  /** Current position in milliseconds. */
  currentMs: number;
  /** Loaded duration in milliseconds. 0 until onLoad fires. */
  durationMs: number;
  rate: PlaybackRate;
  /** True while chrome (top bar, transport, scrub) is visible. */
  chromeVisible: boolean;
  // ── Controls ──
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setRate: (rate: PlaybackRate) => void;
  /** Seek to an absolute ms position. Clamped to [0, durationMs]. */
  seekMs: (ms: number) => void;
  /** Move forward / backward by FRAME_STEP_MS. */
  stepFrame: (direction: 'prev' | 'next') => void;
  /** Tap the player surface — toggles chrome visibility. */
  toggleChrome: () => void;
  // ── Driven by the player ──
  setProgress: (ms: number) => void;
  setDuration: (ms: number) => void;
  /** Called when the video ends. Resets to start, pauses. */
  onEnd: () => void;
}

const CHROME_AUTO_HIDE_MS = 3000;

export function usePlayback({ onSeek }: UsePlaybackArgs): UsePlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [rate, setRateState] = useState<PlaybackRate>(1);
  const [chromeVisible, setChromeVisible] = useState(true);

  // Track the latest auto-hide timer so a new interaction can reset it.
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoHide = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      autoHideTimer.current = null;
    }
  }, []);

  const scheduleAutoHide = useCallback(() => {
    clearAutoHide();
    autoHideTimer.current = setTimeout(() => {
      setChromeVisible(false);
    }, CHROME_AUTO_HIDE_MS);
  }, [clearAutoHide]);

  // Kick off the initial auto-hide so chrome fades after first paint.
  useEffect(() => {
    scheduleAutoHide();
    return clearAutoHide;
  }, [scheduleAutoHide, clearAutoHide]);

  const play = useCallback(() => {
    setIsPlaying(true);
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    // Stay visible while paused — the user is interacting; we'll hide
    // again only when they explicitly tap the player surface.
    clearAutoHide();
    setChromeVisible(true);
  }, [clearAutoHide]);

  const toggle = useCallback(() => {
    setIsPlaying(prev => {
      if (prev) {
        clearAutoHide();
        setChromeVisible(true);
        return false;
      }
      scheduleAutoHide();
      return true;
    });
  }, [scheduleAutoHide, clearAutoHide]);

  const setRate = useCallback(
    (next: PlaybackRate) => {
      setRateState(next);
      scheduleAutoHide();
    },
    [scheduleAutoHide],
  );

  const seekMs = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(durationMs || ms, ms));
      setCurrentMs(clamped);
      onSeek(clamped / 1000);
      // Don't schedule auto-hide here — scrubbing is interaction; user
      // probably wants the chrome to stay. The next play()/pause()
      // call will reset the timer.
      setChromeVisible(true);
    },
    [durationMs, onSeek],
  );

  const stepFrame = useCallback(
    (direction: 'prev' | 'next') => {
      const delta = direction === 'prev' ? -FRAME_STEP_MS : FRAME_STEP_MS;
      seekMs(currentMs + delta);
    },
    [currentMs, seekMs],
  );

  const toggleChrome = useCallback(() => {
    setChromeVisible(prev => {
      if (prev) {
        clearAutoHide();
        return false;
      }
      scheduleAutoHide();
      return true;
    });
  }, [scheduleAutoHide, clearAutoHide]);

  const setProgress = useCallback((ms: number) => {
    setCurrentMs(ms);
  }, []);

  const setDuration = useCallback((ms: number) => {
    setDurationMs(ms);
  }, []);

  const onEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentMs(0);
    onSeek(0);
    setChromeVisible(true);
    clearAutoHide();
  }, [onSeek, clearAutoHide]);

  return {
    isPlaying,
    currentMs,
    durationMs,
    rate,
    chromeVisible,
    play,
    pause,
    toggle,
    setRate,
    seekMs,
    stepFrame,
    toggleChrome,
    setProgress,
    setDuration,
    onEnd,
  };
}
