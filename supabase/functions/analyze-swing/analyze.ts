/**
 * analyze-swing/analyze — Pure request/response helpers
 * The testable, side-effect-free core of the function: the request schema,
 * the Claude-output → `analyses` row mapping, the daily-limit time window,
 * and a defensive code-fence stripper. Kept apart from index.ts so it can
 * be unit-tested with `deno test` without booting the HTTP handler.
 */

import { z } from 'zod';
import type { SwingAnalysis } from './schema.ts';

/** Canonical 8 frames per swing (PROJECT_SPEC §14 frame extraction). */
export const FRAME_COUNT = 8;

/** Server-side daily cap per user (PROJECT_SPEC §14 cost management). */
export const DAILY_LIMIT = 10;

/**
 * What the app sends. The spec's prompt fields (frames, cameraAngle,
 * clubType, swingHand, userSkillLevel, previousIssues) plus `videoId`
 * (needed for the `analyses.video_id` FK) and optional `frameRefs`
 * (canonical-position labels stored alongside the row).
 */
export const AnalyzeRequestSchema = z.object({
  videoId: z.string().uuid(),
  frames: z.array(z.string().min(1)).length(FRAME_COUNT),
  cameraAngle: z.string().min(1),
  clubType: z.string().min(1),
  swingHand: z.enum(['right', 'left']),
  userSkillLevel: z.string().min(1),
  previousIssues: z.array(z.string()).default([]),
  frameRefs: z.array(z.string()).default([]),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export interface RowMeta {
  userId: string;
  videoId: string;
  modelVersion: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  frameRefs: string[];
}

/** An `analyses` table insert row (mirrors src/types/database.ts Insert). */
export interface AnalysisRow {
  user_id: string;
  video_id: string;
  swing_score: number;
  coaching_text: string;
  issues: SwingAnalysis['issues'];
  positives: string[];
  drill: string;
  frame_refs: string[];
  model_version: string;
  prompt_version: string;
  input_tokens: number;
  output_tokens: number;
}

/**
 * Map Claude's validated output + request/usage meta into an `analyses`
 * row. Note the column renames: `score`→`swing_score`, `summary`→
 * `coaching_text` (the table has no `summary`/`score` columns).
 */
export function mapToRow(analysis: SwingAnalysis, meta: RowMeta): AnalysisRow {
  return {
    user_id: meta.userId,
    video_id: meta.videoId,
    swing_score: analysis.score,
    coaching_text: analysis.summary,
    issues: analysis.issues,
    positives: analysis.positives,
    drill: analysis.drill,
    frame_refs: meta.frameRefs,
    model_version: meta.modelVersion,
    prompt_version: meta.promptVersion,
    input_tokens: meta.inputTokens,
    output_tokens: meta.outputTokens,
  };
}

/**
 * Start of today in UTC as an ISO timestamp — the lower bound for the
 * daily-limit count (`created_at >= this`). UTC keeps the window
 * deterministic server-side regardless of the user's timezone.
 */
export function utcDayStartIso(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}

/**
 * Strip a ```json … ``` (or bare ```) fence the model may wrap its JSON
 * in despite the "no markdown" instruction. Returns the inner text, or the
 * trimmed input unchanged when there's no fence.
 */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced ? fenced[1]!.trim() : trimmed;
}
