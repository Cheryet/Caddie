/**
 * useVideoSource — Feature hook
 * Turns the PlaybackScreen's discriminated route params into a single
 * `{uri, meta}` shape that the player can consume. Two paths:
 *
 *   { localUri, … }            — fresh recording, just-shot/imported.
 *                                 Pass the file URI straight through;
 *                                 metadata is whatever the upload
 *                                 pipeline handed us via the route.
 *
 *   { videoId }                — coming from the library tap. Fetch
 *                                 the row from `videos` so we can show
 *                                 club/date in the top bar, then sign
 *                                 the storage URL (15-min TTL).
 *
 * Returns `{ uri, meta, isLoading, error }`. Never throws — the screen
 * branches on `error` to render a fallback. `meta` is null while the
 * row is still loading and once available drives the title chrome.
 */

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

import { supabase } from '@/core/supabase/client';
import { getSignedVideoUrl } from '@/core/supabase/storage';
import type { PlaybackParams } from '@/navigation/types';

// ───── Public shapes ─────────────────────────────────────────────────────

export interface VideoMeta {
  title: string;
  clubType: string | null;
  cameraAngle: 'face-on' | 'dtl' | null;
  swingHand: 'right' | 'left';
  createdAt: string;
}

export interface VideoSourceError {
  code: 'not_found' | 'network' | 'unknown';
  message: string;
}

interface UseVideoSourceReturn {
  uri: string | null;
  meta: VideoMeta | null;
  isLoading: boolean;
  error: VideoSourceError | null;
  /** Re-fetch the row + re-sign the URL. No-op for local URIs. */
  refresh: () => Promise<void>;
}

// ───── Row validation ────────────────────────────────────────────────────

const RowSchema = z.object({
  title: z.string(),
  club_type: z.string().nullable(),
  camera_angle: z.string().nullable(),
  swing_hand: z.string(),
  storage_path: z.string(),
  created_at: z.string().nullable(),
});

const COLUMNS = 'title,club_type,camera_angle,swing_hand,storage_path,created_at';

function rowToMeta(row: z.infer<typeof RowSchema>): VideoMeta {
  const angle =
    row.camera_angle === 'face-on' || row.camera_angle === 'dtl'
      ? row.camera_angle
      : null;
  const hand = row.swing_hand === 'left' ? 'left' : 'right';
  return {
    title: row.title,
    clubType: row.club_type,
    cameraAngle: angle,
    swingHand: hand,
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

// ───── Hook ──────────────────────────────────────────────────────────────

export function useVideoSource(params: PlaybackParams): UseVideoSourceReturn {
  // Local-recording fast path — synchronous, no network.
  const isLocal = 'localUri' in params;
  // Pull primitives out of `params` so effect deps stay stable across
  // renders (the params *object* is re-created by React Navigation on
  // every render but its contents don't change for the screen's life).
  const localUri = isLocal ? params.localUri : null;
  const videoId = isLocal ? null : params.videoId;

  const localMeta: VideoMeta | null = isLocal
    ? {
        title: `${params.clubType} swing`,
        clubType: params.clubType,
        cameraAngle: params.angle,
        swingHand: params.swingHand,
        createdAt: new Date().toISOString(),
      }
    : null;

  const [uri, setUri] = useState<string | null>(localUri);
  const [meta, setMeta] = useState<VideoMeta | null>(localMeta);
  const [isLoading, setIsLoading] = useState(!isLocal);
  const [error, setError] = useState<VideoSourceError | null>(null);

  const fetchRemote = useCallback(async (): Promise<void> => {
    if (!videoId) return;
    setIsLoading(true);
    setError(null);

    const { data: rowData, error: rowError } = await supabase
      .from('videos')
      .select(COLUMNS)
      .eq('id', videoId)
      .single();

    if (rowError) {
      const code: VideoSourceError['code'] = /not found|no rows/i.test(
        rowError.message ?? '',
      )
        ? 'not_found'
        : /network|fetch|timeout/i.test(rowError.message ?? '')
        ? 'network'
        : 'unknown';
      setError({
        code,
        message: rowError.message ?? 'Could not load swing.',
      });
      setIsLoading(false);
      return;
    }

    const parsed = RowSchema.safeParse(rowData);
    if (!parsed.success) {
      setError({ code: 'unknown', message: 'Swing data is malformed.' });
      setIsLoading(false);
      return;
    }

    const signed = await getSignedVideoUrl(parsed.data.storage_path);
    if (signed.error || !signed.data) {
      setError({
        code: signed.error?.code === 'not_found' ? 'not_found' : 'unknown',
        message: signed.error?.message ?? 'Could not load video.',
      });
      setIsLoading(false);
      return;
    }

    setUri(signed.data.url);
    setMeta(rowToMeta(parsed.data));
    setIsLoading(false);
  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;
    fetchRemote().catch(() => {
      // Errors surface via setError inside the closure.
    });
  }, [videoId, fetchRemote]);

  // clubType / angle / swingHand are consumed when building localMeta
  // above; no further references needed.

  return { uri, meta, isLoading, error, refresh: fetchRemote };
}
