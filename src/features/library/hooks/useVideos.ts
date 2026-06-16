/**
 * useVideos — Feature hook
 * Fetches the signed-in user's swing videos for the LibraryScreen grid.
 * Owns:
 *   - the network call to the `videos` table (ordered newest-first)
 *   - Zod validation of every row before it reaches the UI
 *   - resolving each row's `thumbnail_path` to a public Storage URL so
 *     `<Image source={{ uri }} />` works without an extra hook layer
 *
 * The list is intentionally NOT pushed into the Zustand store — per
 * PROJECT_SPEC.md §11 the store is restricted to auth/subscription/theme
 * and server data lives in feature hooks.
 *
 * Used by: LibraryScreen. No other screen should call this directly;
 * adding a second caller is a sign the data belongs in a shared layer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { supabase } from '@/core/supabase/client';
import { useAppStore } from '@/store/useAppStore';

// ───── Domain types ──────────────────────────────────────────────────────

export interface Video {
  id: string;
  title: string;
  clubType: string | null;
  cameraAngle: 'face-on' | 'dtl' | null;
  swingHand: 'right' | 'left';
  durationMs: number | null;
  /** Bucket-relative path inside `videos` storage, e.g. `{user}/{id}.mp4`. */
  storagePath: string;
  /** Bucket-relative path inside `thumbnails` storage, or null if absent. */
  thumbnailPath: string | null;
  /** Resolved public URL for the thumbnail (null when thumbnailPath is). */
  thumbnailUrl: string | null;
  hasAnalysis: boolean;
  createdAt: string;
  tags: string[];
}

// ───── Row validation ────────────────────────────────────────────────────
// We only validate the fields the grid needs. Stricter validation belongs
// in the upload pipeline; here we want defensive reads, not schema policing.
const RowSchema = z.object({
  id: z.string(),
  title: z.string(),
  club_type: z.string().nullable(),
  camera_angle: z.string().nullable(),
  swing_hand: z.string(),
  duration_ms: z.number().nullable(),
  storage_path: z.string(),
  thumbnail_path: z.string().nullable(),
  has_analysis: z.boolean().nullable(),
  created_at: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
});

function rowToVideo(row: z.infer<typeof RowSchema>): Video {
  const angle =
    row.camera_angle === 'face-on' || row.camera_angle === 'dtl'
      ? row.camera_angle
      : null;
  const hand = row.swing_hand === 'left' ? 'left' : 'right';

  // Thumbnails live in a public bucket — getPublicUrl is synchronous and
  // doesn't issue a network call.
  const thumbnailUrl = row.thumbnail_path
    ? supabase.storage.from('thumbnails').getPublicUrl(row.thumbnail_path).data
        .publicUrl
    : null;

  return {
    id: row.id,
    title: row.title,
    clubType: row.club_type,
    cameraAngle: angle,
    swingHand: hand,
    durationMs: row.duration_ms,
    storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    thumbnailUrl,
    hasAnalysis: row.has_analysis ?? false,
    createdAt: row.created_at ?? new Date(0).toISOString(),
    tags: row.tags ?? [],
  };
}

// ───── Hook ──────────────────────────────────────────────────────────────

export interface VideosError {
  code: 'unauthenticated' | 'network' | 'unknown';
  message: string;
}

interface UseVideosReturn {
  videos: Video[] | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: VideosError | null;
  refresh: () => Promise<void>;
}

const COLUMNS =
  'id,title,club_type,camera_angle,swing_hand,duration_ms,storage_path,thumbnail_path,has_analysis,created_at,tags';

export function useVideos(): UseVideosReturn {
  const userId = useAppStore(s => s.user?.id ?? null);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);

  const [videos, setVideos] = useState<Video[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<VideosError | null>(null);

  // Track unmount so a slow query doesn't setState after teardown.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const fetchVideos = useCallback(
    async (mode: 'initial' | 'refresh'): Promise<void> => {
      if (!userId) {
        if (!aliveRef.current) return;
        setVideos([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setError({
          code: 'unauthenticated',
          message: 'Sign in to see your swings.',
        });
        return;
      }

      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('videos')
        .select(COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!aliveRef.current) return;

      if (dbError) {
        const msg = dbError.message ?? '';
        const code: VideosError['code'] = /network|fetch|timeout/i.test(msg)
          ? 'network'
          : 'unknown';
        setError({ code, message: msg || 'Could not load your swings.' });
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const validated: Video[] = [];
      for (const raw of data ?? []) {
        const parsed = RowSchema.safeParse(raw);
        if (parsed.success) {
          validated.push(rowToVideo(parsed.data));
        } else if (__DEV__) {
          console.warn('[useVideos] dropped malformed row', parsed.error);
        }
      }
      setVideos(validated);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [userId],
  );

  // Initial fetch — wait until auth has settled so we don't issue a
  // doomed query while the session is restoring from MMKV.
  useEffect(() => {
    if (isAuthLoading) return;
    fetchVideos('initial').catch(() => {
      // Errors surface via setError inside the closure; nothing to do.
    });
  }, [isAuthLoading, fetchVideos]);

  const refresh = useCallback(async () => {
    await fetchVideos('refresh');
  }, [fetchVideos]);

  return { videos, isLoading, isRefreshing, error, refresh };
}
