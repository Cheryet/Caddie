/**
 * useComparePanel — Feature hook
 * Everything one side of the comparison needs: it resolves a selected
 * `videoId` to a playable signed URL + a "Club · date" label, and owns that
 * panel's playback state (play/pause, position, 0.5×/1× rate). One instance
 * per panel; useComparison composes two.
 *
 * Mirrors usePlayback's seek pattern — the hook calls `onSeek` (wired to the
 * panel's <VideoPlayer> ref by the parent) so it never imports the player.
 * Lighter than usePlayback: no chrome/auto-hide, and a 0.5×/1× rate (slow-mo
 * is the default — that's the point of comparing swings).
 *
 * Sessions are ephemeral — nothing here is persisted.
 *
 * Part of: src/features/comparison/
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { supabase } from '@/core/supabase/client';
import { getSignedVideoUrl } from '@/core/supabase/storage';
import { formatRelativeDate } from '@/utils/relativeTime';
import type {
  CompareRate,
  ComparePanelState,
  ComparePanelStatus,
} from '@/features/comparison/types';

// Re-export the rate constant so existing call sites can reach it via the
// hook; the canonical home is @/features/comparison/types.
export { COMPARE_RATES } from '@/features/comparison/types';
export type { ComparePanelState } from '@/features/comparison/types';

interface UseComparePanelArgs {
  videoId: string | null;
  /** Seek the panel's player (seconds). Wired to the <VideoPlayer> ref. */
  onSeek: (seconds: number) => void;
}

const ROW_COLUMNS = 'club_type,created_at,storage_path';

const RowSchema = z.object({
  club_type: z.string().nullable(),
  created_at: z.string().nullable(),
  storage_path: z.string(),
});

export function useComparePanel({
  videoId,
  onSeek,
}: UseComparePanelArgs): ComparePanelState {
  const [status, setStatus] = useState<ComparePanelStatus>(
    videoId ? 'loading' : 'empty',
  );
  const [uri, setUri] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  // Comparison opens paused on the first frame (you scrub to compare
  // positions); 0.5× by default since slow-mo is the point.
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [rate, setRateState] = useState<CompareRate>(0.5);

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Resolve the selected video → signed URL + label. Re-runs (and resets
  // playback) whenever the slot's videoId changes.
  useEffect(() => {
    setUri(null);
    setLabel(null);
    setIsPlaying(false);
    setCurrentMs(0);
    setDurationMs(0);

    if (!videoId) {
      setStatus('empty');
      return;
    }

    setStatus('loading');
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('videos')
        .select(ROW_COLUMNS)
        .eq('id', videoId)
        .single();
      if (cancelled || !aliveRef.current) return;

      const parsed = error ? null : RowSchema.safeParse(data);
      if (!parsed || !parsed.success) {
        setStatus('error');
        return;
      }

      const signed = await getSignedVideoUrl(parsed.data.storage_path);
      if (cancelled || !aliveRef.current) return;
      if (signed.error || !signed.data) {
        setStatus('error');
        return;
      }

      const club = parsed.data.club_type ?? 'Swing';
      const when = formatRelativeDate(parsed.data.created_at ?? '') || 'Today';
      setUri(signed.data.url);
      setLabel(`${club} · ${when}`);
      setStatus('ready');
    })();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying(prev => !prev), []);

  const seekMs = useCallback(
    (ms: number) => {
      const clamped = Math.max(0, Math.min(durationMs || ms, ms));
      setCurrentMs(clamped);
      onSeek(clamped / 1000);
    },
    [durationMs, onSeek],
  );

  const setRate = useCallback((next: CompareRate) => setRateState(next), []);
  const setProgress = useCallback((ms: number) => setCurrentMs(ms), []);
  const setDuration = useCallback((ms: number) => setDurationMs(ms), []);

  const onEnd = useCallback(() => {
    setIsPlaying(false);
    setCurrentMs(0);
    onSeek(0);
  }, [onSeek]);

  return {
    videoId,
    status,
    uri,
    label,
    isPlaying,
    currentMs,
    durationMs,
    rate,
    play,
    pause,
    toggle,
    seekMs,
    setRate,
    setProgress,
    setDuration,
    onEnd,
  };
}
