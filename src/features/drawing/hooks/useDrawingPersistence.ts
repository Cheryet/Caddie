/**
 * useDrawingPersistence — Feature hook
 * Round-trips the canvas's shapes through `videos.drawings`:
 *
 *   on mount (videoId, canvasSize known) → fetch row → Zod-validate
 *     → denormalize to pixel space → hydrate the drawing state
 *
 *   on `shapes` change → wait 1s → normalize → update row
 *     (any further change before the timer fires resets it)
 *
 * Driven by PlaybackScreen. Local-only recordings (`localUri` route
 * with no `videoId`) skip persistence entirely — those shapes are
 * ephemeral until the upload pipeline commits a row.
 *
 * Spec: PROJECT_SPEC.md §22 Phase 2.4.
 */

import { useEffect, useRef } from 'react';

import { Toast } from '@/components/ui';
import { supabase } from '@/core/supabase/client';
import {
  fromPersisted,
  toPersisted,
} from '@/features/drawing/utils/normalize';
import type {
  CanvasSize,
  DrawingState,
} from '@/features/drawing/types';

const SAVE_DEBOUNCE_MS = 1000;

interface UseDrawingPersistenceArgs {
  /** The row id to persist into. When `null`, persistence is disabled. */
  videoId: string | null;
  /** Current canvas dimensions; needed to denormalize on load. */
  canvasSize: CanvasSize;
  /** Live shapes; the hook debounce-saves any change. */
  shapes: DrawingState;
  /** Loader callback — called once with the parsed shapes after fetch. */
  onLoaded: (shapes: DrawingState) => void;
}

export function useDrawingPersistence({
  videoId,
  canvasSize,
  shapes,
  onLoaded,
}: UseDrawingPersistenceArgs): void {
  // Two refs gate the lifecycle:
  //   loadStartedRef     — guards against duplicate fetches; flips
  //                        the moment the load effect runs.
  //   loadFinishedRef    — gates the save effect. Saves can't fire
  //                        until the load (or the no-load short-
  //                        circuit) has settled, otherwise the empty
  //                        initial state of useDrawing would clobber
  //                        whatever was persisted.
  // onLoadedRef holds the latest handler so we don't refetch when
  // its identity changes.
  const loadStartedRef = useRef<string | null>(null);
  const loadFinishedRef = useRef<string | null>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  // ── Initial load ────────────────────────────────────────────────────
  useEffect(() => {
    if (!videoId) return;
    if (canvasSize.width === 0 || canvasSize.height === 0) return;
    if (loadStartedRef.current === videoId) return;
    loadStartedRef.current = videoId;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('drawings')
        .eq('id', videoId)
        .single();
      if (cancelled) return;
      if (error || !data) {
        loadFinishedRef.current = videoId; // unblock saves
        return;
      }
      const parsed = fromPersisted(data.drawings, canvasSize);
      loadFinishedRef.current = videoId;
      if (parsed === null) return; // null drawings — nothing to hydrate
      if ('error' in parsed) {
        Toast.show({
          message: 'Could not load annotations.',
          variant: 'error',
        });
        return;
      }
      onLoadedRef.current(parsed.shapes);
    })();
    return () => {
      cancelled = true;
    };
  }, [videoId, canvasSize]);

  // ── Debounced save ──────────────────────────────────────────────────
  // We use a ref for the timer so we never collide a pending save with
  // a fresh one. Saving an empty array is intentional — undoing all
  // shapes should wipe the persisted state.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!videoId) return;
    if (canvasSize.width === 0 || canvasSize.height === 0) return;
    // Wait for the initial load to settle before we start
    // overwriting the row — otherwise the empty initial state of
    // useDrawing would clobber whatever was persisted.
    if (loadFinishedRef.current !== videoId) return;

    // Cheap diff via JSON; debounce so consecutive setShapes calls
    // (e.g. mid-edit recolor → undo) collapse to a single write.
    const persisted = toPersisted(shapes, canvasSize);
    const serialized = JSON.stringify(persisted);
    if (serialized === lastSavedRef.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      lastSavedRef.current = serialized;
      // Fire-and-forget — errors surface on the next load; not worth
      // a toast here since drawings are personal and recoverable.
      supabase
        .from('videos')
        .update({ drawings: persisted })
        .eq('id', videoId)
        .then(() => undefined);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [shapes, videoId, canvasSize]);

  // ── Reset when videoId changes ──────────────────────────────────────
  useEffect(() => {
    return () => {
      lastSavedRef.current = null;
      loadStartedRef.current = null;
      loadFinishedRef.current = null;
    };
  }, [videoId]);
}
