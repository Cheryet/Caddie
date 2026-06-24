/**
 * useInsightFrame — Feature hook
 * Re-derives the single swing frame an insight references, for the
 * InsightDetailScreen. The 8 analysis frames are sent to Claude but never
 * persisted — only the video is (`videos.storage_path`) — so we reconstruct
 * the one needed still on demand, reusing the existing pipeline pieces:
 *
 *   1. Read the minimal video meta (`storage_path`, `duration_ms`).
 *   2. Mint a signed URL (`getSignedVideoUrl`).
 *   3. Timestamp = `fallbackTimestamps(durationMs)[frameIndex]` — the same
 *      deterministic 10/20/30/45/55/65/75/90% schedule the extractor uses
 *      (hand-agnostic). It lands on the correct swing *phase*; exact-frame
 *      fidelity would need the 8 timestamps persisted on the analysis row
 *      (a future enrichment — see the plan).
 *   4. `extractFrameJpegs` → one base64 JPEG. This runs on a remote signed
 *      URL and without the pose engine (the analyze path does exactly this,
 *      and it works on the Simulator — see utils/frameExtractor).
 *
 * Any failure (offline, missing video, native error) degrades to `'error'`
 * so the screen shows its frameless fallback rather than crashing. The
 * insight text itself comes from route params, so it renders regardless.
 *
 * Used by: InsightDetailScreen.
 */

import { useEffect, useState } from 'react';
import { z } from 'zod';

import { extractFrameJpegs } from '@/core/pose';
import { supabase } from '@/core/supabase/client';
import { getSignedVideoUrl } from '@/core/supabase/storage';
import {
  ANALYSIS_FRAME_JPEG_QUALITY,
  ANALYSIS_FRAME_MAX_PX,
} from '@/constants/config';
import { fallbackTimestamps } from '@/utils/frameExtractor';

export type InsightFrameStatus = 'loading' | 'ready' | 'error';

export interface UseInsightFrameReturn {
  status: InsightFrameStatus;
  /** `data:image/jpeg;base64,…` URI for the extracted still; null until ready. */
  frameUri: string | null;
}

const FrameMetaSchema = z.object({
  storage_path: z.string(),
  duration_ms: z.number().nullable(),
});

const FRAME_META_COLUMNS = 'storage_path,duration_ms';

interface FrameMeta {
  storagePath: string;
  durationMs: number;
}

/** Read the minimal video meta needed to place + extract a frame. */
async function fetchFrameMeta(videoId: string): Promise<FrameMeta | null> {
  const { data, error } = await supabase
    .from('videos')
    .select(FRAME_META_COLUMNS)
    .eq('id', videoId)
    .single();
  if (error || !data) return null;
  const parsed = FrameMetaSchema.safeParse(data);
  if (!parsed.success) return null;
  // No duration → we can't locate the position; let the caller fall back.
  if (!parsed.data.duration_ms || parsed.data.duration_ms <= 0) return null;
  return {
    storagePath: parsed.data.storage_path,
    durationMs: parsed.data.duration_ms,
  };
}

export function useInsightFrame(
  videoId: string,
  frameIndex: number,
): UseInsightFrameReturn {
  const [status, setStatus] = useState<InsightFrameStatus>('loading');
  const [frameUri, setFrameUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setFrameUri(null);

    (async () => {
      try {
        const meta = await fetchFrameMeta(videoId);
        if (!meta) {
          if (!cancelled) setStatus('error');
          return;
        }

        const signed = await getSignedVideoUrl(meta.storagePath);
        if (signed.error || !signed.data) {
          if (!cancelled) setStatus('error');
          return;
        }

        const timestampMs = fallbackTimestamps(meta.durationMs)[frameIndex];
        if (timestampMs === undefined) {
          if (!cancelled) setStatus('error');
          return;
        }

        const [base64] = await extractFrameJpegs(
          signed.data.url,
          [timestampMs],
          ANALYSIS_FRAME_MAX_PX,
          ANALYSIS_FRAME_JPEG_QUALITY,
        );
        if (cancelled) return;
        if (!base64) {
          setStatus('error');
          return;
        }
        setFrameUri(`data:image/jpeg;base64,${base64}`);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [videoId, frameIndex]);

  return { status, frameUri };
}
