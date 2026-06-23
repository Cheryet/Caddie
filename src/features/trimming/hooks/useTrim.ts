/**
 * useTrim — Feature hook
 * Owns the trim state for one clip on the PlaybackScreen: whether the
 * TrimBar is open, the committed [start,end] range (null = full clip),
 * and the filmstrip thumbnails. The actual re-encode is deferred to
 * `materialize()`, which the Save flow calls once — "trim on save" — so
 * the player never has to swap between the original and a trimmed file
 * and repeated edits never re-encode a re-encode (quality loss).
 *
 * Thumbnails reuse `@/core/pose`'s `extractFrameJpegs` (a generic
 * AVAssetImageGenerator frame grab — runs in the simulator), so no new
 * native frame code is needed.
 *
 * Used by: PlaybackScreen (local recordings + imports only).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { extractFrameJpegs } from '@/core/pose';
import { trimVideo } from '@/core/trim';

import {
  FILMSTRIP_THUMB_COUNT,
  FILMSTRIP_THUMB_QUALITY,
  FILMSTRIP_THUMB_SIZE,
  MIN_TRIM_DURATION_MS,
} from '../constants';

export interface TrimRange {
  startMs: number;
  endMs: number;
}

export type ThumbsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseTrimArgs {
  /** Local file URI of the clip (null while the source is resolving). */
  uri: string | null;
  /** Clip duration in ms (0 until the player reports it). */
  durationMs: number;
}

export interface UseTrimReturn {
  isOpen: boolean;
  /** Committed selection, or null when the full clip is kept. */
  range: TrimRange | null;
  hasTrim: boolean;
  /** Filmstrip thumbnails as ready-to-render `data:` URIs. */
  thumbnails: string[];
  thumbsStatus: ThumbsStatus;
  minDurationMs: number;
  open: () => void;
  close: () => void;
  /** Commit a selection from the TrimBar. A near-full range clears the trim. */
  commit: (startMs: number, endMs: number) => void;
  clear: () => void;
  /**
   * Produce the clip to upload: the trimmed file (with its real duration)
   * when a range is set, otherwise the original URI unchanged and a null
   * duration (caller falls back to the player's loaded duration). Throws
   * if the native trim fails.
   */
  materialize: (originalUri: string) => Promise<MaterializedClip>;
}

export interface MaterializedClip {
  uri: string;
  /** Trimmed duration in ms, or null when the clip wasn't trimmed. */
  durationMs: number | null;
}

/**
 * Sample at the centre of each of `count` equal segments so the strip
 * spans the clip evenly without duplicating the exact first/last frame.
 */
function sampleTimes(durationMs: number, count: number): number[] {
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    times.push(Math.round(((i + 0.5) / count) * durationMs));
  }
  return times;
}

export function useTrim({ uri, durationMs }: UseTrimArgs): UseTrimReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [range, setRange] = useState<TrimRange | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbsStatus, setThumbsStatus] = useState<ThumbsStatus>('idle');
  const loadStartedRef = useRef(false);

  // Load filmstrip thumbnails once, the first time the bar opens with a
  // known duration. Best-effort: a failure just leaves a plain track.
  useEffect(() => {
    if (!isOpen || loadStartedRef.current) return;
    if (!uri || durationMs <= 0) return;
    loadStartedRef.current = true;
    setThumbsStatus('loading');
    const times = sampleTimes(durationMs, FILMSTRIP_THUMB_COUNT);
    extractFrameJpegs(uri, times, FILMSTRIP_THUMB_SIZE, FILMSTRIP_THUMB_QUALITY)
      .then(b64s => {
        setThumbnails(b64s.map(b => `data:image/jpeg;base64,${b}`));
        setThumbsStatus('ready');
      })
      .catch(() => {
        setThumbsStatus('error');
      });
  }, [isOpen, uri, durationMs]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const commit = useCallback(
    (startMs: number, endMs: number) => {
      const clampedStart = Math.max(0, Math.min(startMs, durationMs));
      const clampedEnd = Math.max(0, Math.min(endMs, durationMs));
      // Final guard — the TrimBar already stops the handles crossing,
      // but never commit a sub-minimum range.
      if (clampedEnd - clampedStart < MIN_TRIM_DURATION_MS) {
        setIsOpen(false);
        return;
      }
      // A selection that (all but) spans the clip means "no trim".
      const isFull = clampedStart <= 1 && clampedEnd >= durationMs - 1;
      setRange(isFull ? null : { startMs: clampedStart, endMs: clampedEnd });
      setIsOpen(false);
    },
    [durationMs],
  );

  const clear = useCallback(() => setRange(null), []);

  const materialize = useCallback(
    async (originalUri: string): Promise<MaterializedClip> => {
      if (!range) return { uri: originalUri, durationMs: null };
      const result = await trimVideo(originalUri, range.startMs, range.endMs);
      return { uri: result.uri, durationMs: result.durationMs };
    },
    [range],
  );

  return {
    isOpen,
    range,
    hasTrim: range !== null,
    thumbnails,
    thumbsStatus,
    minDurationMs: MIN_TRIM_DURATION_MS,
    open,
    close,
    commit,
    clear,
    materialize,
  };
}
