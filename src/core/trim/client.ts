/**
 * core/trim/client — Video-trim abstraction
 * Thin pass-through to the `caddie-trim` native bridge, kept as a core
 * wrapper so feature code never imports the engine package directly and
 * the engine can be swapped without touching the app (mirrors the
 * core/pose boundary — §16 Risk 4 style).
 */

import { trimVideo as nativeTrimVideo } from 'caddie-trim';
import type { TrimResult } from 'caddie-trim';

export type { TrimResult };

/**
 * Re-encode the [startMs, endMs] slice of a local video to a new mp4 in
 * the temp dir. Resolves with the trimmed `{ uri, durationMs }`; rejects
 * if the native module is missing or the export fails.
 */
export function trimVideo(
  inputPath: string,
  startMs: number,
  endMs: number,
): Promise<TrimResult> {
  return nativeTrimVideo(inputPath, startMs, endMs);
}
