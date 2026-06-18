/**
 * useAnalysis — Feature hook
 * Owns the swing-analysis flow for AnalysisScreen (PROJECT_SPEC §22 4.4):
 *
 *   1. Load the video meta (for the subtitle + analyze inputs) and check the
 *      `analyses` cache in parallel.
 *   2. Cache HIT  → render it. No Edge Function call (the §14 caching rule:
 *      an analysis is never regenerated automatically).
 *   3. Cache MISS → extract the 8 frames and call the `analyze-swing` Edge
 *      Function, which runs Claude Vision, enforces the daily limit, tracks
 *      tokens, and persists the row. We validate the envelope and render it.
 *
 * The user already opted in by tapping "Analyse with AI" on PlaybackScreen,
 * so a cache miss analyses immediately. `refresh()` is the only way to
 * regenerate after that. One request in flight at a time.
 *
 * The Anthropic key never touches the app — all Claude calls go through the
 * Edge Function (CLAUDE.md non-negotiable).
 *
 * Used by: AnalysisScreen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { supabase } from '@/core/supabase/client';
import { getSignedVideoUrl } from '@/core/supabase/storage';
import { useAppStore } from '@/store/useAppStore';
import { SWING_POSITIONS } from '@/constants/swingPositions';
import { extractAnalysisFrames } from '@/utils/frameExtractor';
import { formatRelativeDate } from '@/utils/relativeTime';
import type { SwingAnalysis } from '@/types/analysis';
import {
  mapFunctionError,
  NETWORK_ERROR,
  parseAnalyzeEnvelope,
  parseStoredAnalysis,
  type AnalysisError,
} from '@/features/analysis/parseAnalysis';

// 'loading'   → fetching meta + checking the cache
// 'analyzing' → frames extracting + Claude running (the slow path)
// 'ready'     → analysis available
// 'error'     → see `error`
export type AnalysisStatus = 'loading' | 'analyzing' | 'ready' | 'error';

export interface UseAnalysisReturn {
  status: AnalysisStatus;
  analysis: SwingAnalysis | null;
  /** "Driver · Today" line under the score. Null until meta loads. */
  subtitle: string | null;
  error: AnalysisError | null;
  /** Run (or re-run) the analysis. Retries after an error; forces a fresh
   *  Claude call even on a cache hit (the explicit-refresh path). */
  refresh: () => Promise<void>;
}

interface VideoAnalysisMeta {
  clubType: string | null;
  cameraAngle: 'face-on' | 'dtl' | null;
  swingHand: 'right' | 'left';
  durationMs: number | null;
  storagePath: string;
  createdAt: string;
}

const MetaRowSchema = z.object({
  club_type: z.string().nullable(),
  camera_angle: z.string().nullable(),
  swing_hand: z.string(),
  duration_ms: z.number().nullable(),
  storage_path: z.string(),
  created_at: z.string().nullable(),
});

const CACHE_COLUMNS = 'swing_score,coaching_text,issues,positives,drill,created_at';
const META_COLUMNS = 'club_type,camera_angle,swing_hand,duration_ms,storage_path,created_at';

const NOT_FOUND_ERROR: AnalysisError = {
  code: 'not_found',
  message: 'Could not load this swing.',
  retryable: false,
};

function rowToMeta(row: z.infer<typeof MetaRowSchema>): VideoAnalysisMeta {
  const angle =
    row.camera_angle === 'face-on' || row.camera_angle === 'dtl'
      ? row.camera_angle
      : null;
  return {
    clubType: row.club_type,
    cameraAngle: angle,
    swingHand: row.swing_hand === 'left' ? 'left' : 'right',
    durationMs: row.duration_ms,
    storagePath: row.storage_path,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function buildSubtitle(meta: VideoAnalysisMeta): string {
  const club = meta.clubType ?? 'Swing';
  const when = formatRelativeDate(meta.createdAt) || 'Today';
  return `${club} · ${when}`;
}

/** Read the newest cached analysis for a video, or null on miss/malformed. */
async function fetchCachedAnalysis(videoId: string): Promise<SwingAnalysis | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select(CACHE_COLUMNS)
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return parseStoredAnalysis(data);
}

async function fetchMeta(videoId: string): Promise<VideoAnalysisMeta | null> {
  const { data, error } = await supabase
    .from('videos')
    .select(META_COLUMNS)
    .eq('id', videoId)
    .single();
  if (error || !data) return null;
  const parsed = MetaRowSchema.safeParse(data);
  return parsed.success ? rowToMeta(parsed.data) : null;
}

async function fetchSkillLevel(userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('skill_level')
    .eq('id', userId)
    .maybeSingle();
  return data?.skill_level ?? 'intermediate';
}

/**
 * Turn a failed `functions.invoke` into a typed, user-facing error. A
 * non-2xx response is a `FunctionsHttpError` carrying the `Response` on
 * `.context`; we read its `{ error: { code } }` body. Duck-typed (rather
 * than `instanceof`) so the hook stays decoupled from the SDK's error
 * classes. Anything without a readable body is treated as a network failure.
 */
async function mapInvokeError(fnError: unknown): Promise<AnalysisError> {
  const context = (fnError as { context?: { json?: () => Promise<unknown> } })
    ?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as { error?: { code?: string } };
      return mapFunctionError(body?.error?.code);
    } catch {
      return mapFunctionError(undefined);
    }
  }
  return NETWORK_ERROR;
}

export function useAnalysis(videoId: string): UseAnalysisReturn {
  const userId = useAppStore(s => s.user?.id ?? null);

  const [status, setStatus] = useState<AnalysisStatus>('loading');
  const [analysis, setAnalysis] = useState<SwingAnalysis | null>(null);
  const [subtitle, setSubtitle] = useState<string | null>(null);
  const [error, setError] = useState<AnalysisError | null>(null);

  const aliveRef = useRef(true);
  const inFlightRef = useRef(false);
  // Cache the loaded meta so refresh()/retry doesn't re-fetch the video row.
  const metaRef = useRef<VideoAnalysisMeta | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // The Claude pipeline — runs on a cache miss and on every explicit refresh.
  const runAnalysis = useCallback(
    async (meta: VideoAnalysisMeta): Promise<void> => {
      if (inFlightRef.current || !userId) return;
      inFlightRef.current = true;
      setStatus('analyzing');
      setError(null);

      try {
        const signed = await getSignedVideoUrl(meta.storagePath);
        if (signed.error || !signed.data) {
          if (!aliveRef.current) return;
          setError(NOT_FOUND_ERROR);
          setStatus('error');
          return;
        }

        const skillLevel = await fetchSkillLevel(userId);
        const { frames } = await extractAnalysisFrames(signed.data.url, {
          swingHand: meta.swingHand,
          durationMs: meta.durationMs ?? 0,
        });

        const { data, error: fnError } = await supabase.functions.invoke(
          'analyze-swing',
          {
            body: {
              videoId,
              frames,
              cameraAngle: meta.cameraAngle ?? 'face-on',
              clubType: meta.clubType ?? 'Unknown',
              swingHand: meta.swingHand,
              userSkillLevel: skillLevel,
              // Cross-swing issue context is a future enrichment (§14).
              previousIssues: [],
              frameRefs: SWING_POSITIONS.map(p => p.name),
            },
          },
        );

        if (!aliveRef.current) return;

        if (fnError) {
          setError(await mapInvokeError(fnError));
          setStatus('error');
          return;
        }

        const parsed = parseAnalyzeEnvelope(data);
        if (!parsed) {
          setError(mapFunctionError('schema_error'));
          setStatus('error');
          return;
        }

        setAnalysis(parsed);
        setStatus('ready');
      } catch {
        if (!aliveRef.current) return;
        setError(NETWORK_ERROR);
        setStatus('error');
      } finally {
        inFlightRef.current = false;
      }
    },
    [userId, videoId],
  );

  // Initial load: meta + cache in parallel, then branch (hit → ready, miss →
  // analyze). Also the retry entry point once meta failed to load.
  const load = useCallback(async (): Promise<void> => {
    if (!userId) {
      setError({
        code: 'unauthenticated',
        message: 'Sign in to analyse your swings.',
        retryable: false,
      });
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError(null);

    const [meta, cached] = await Promise.all([
      fetchMeta(videoId),
      fetchCachedAnalysis(videoId),
    ]);
    if (!aliveRef.current) return;

    if (!meta) {
      setError(NOT_FOUND_ERROR);
      setStatus('error');
      return;
    }
    metaRef.current = meta;
    setSubtitle(buildSubtitle(meta));

    if (cached) {
      setAnalysis(cached);
      setStatus('ready');
      return;
    }

    await runAnalysis(meta);
  }, [userId, videoId, runAnalysis]);

  useEffect(() => {
    load().catch(() => {
      // Errors surface via setError inside the closure.
    });
  }, [load]);

  const refresh = useCallback(async (): Promise<void> => {
    const meta = metaRef.current;
    if (meta) {
      await runAnalysis(meta);
    } else {
      await load();
    }
  }, [load, runAnalysis]);

  return { status, analysis, subtitle, error, refresh };
}
