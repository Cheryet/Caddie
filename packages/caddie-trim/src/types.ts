/**
 * caddie-trim/types — Public result type
 * Mirrors the shape returned by the native bridge's `trimVideo`.
 */

export interface TrimResult {
  /** file:// URI of the trimmed mp4 written to the temp dir. */
  uri: string;
  /** Duration of the trimmed clip in milliseconds. */
  durationMs: number;
}
