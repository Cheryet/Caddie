/**
 * parseAnalysis — Zod validation + mappers
 * The app-side boundary for swing-analysis data (PROJECT_SPEC §14 "Response
 * validation"). Two inputs resolve to the same `SwingAnalysis` domain shape:
 *   - a cached `analyses` row (read straight from Postgres on a cache hit)
 *   - the `analyze-swing` Edge Function envelope (`{ analysis: <row>, … }`)
 *
 * Both store Claude's snake_case columns (`swing_score`, `coaching_text`,
 * `issues[].frame_index`); the mappers rename them to the camelCase domain
 * type the UI renders. Unknown keys on the row (id, user_id, tokens, …) are
 * stripped by Zod — we validate only what the screen needs.
 *
 * Pure + side-effect-free so it's unit-tested directly. The Edge Function has
 * its OWN server-side schema (supabase/functions/analyze-swing/schema.ts);
 * this is the independent app-side check (the two validate different things).
 *
 * Part of: src/features/analysis/
 */

import { z } from 'zod';

import type { SwingAnalysis, SwingIssue } from '@/types/analysis';

// Stored issue — Claude's snake_case shape inside the `issues` jsonb column.
const StoredIssueSchema = z.object({
  name: z.string(),
  severity: z.enum(['minor', 'moderate', 'major']),
  frame_index: z.number().int().min(0).max(7),
  description: z.string(),
  fix: z.string(),
});

// The `analyses` row fields the report needs (mirrors PROJECT_SPEC §12).
export const StoredAnalysisSchema = z.object({
  swing_score: z.number().int().min(0).max(100),
  coaching_text: z.string().min(1),
  issues: z.array(StoredIssueSchema),
  positives: z.array(z.string()),
  drill: z.string(),
});

export type StoredAnalysis = z.infer<typeof StoredAnalysisSchema>;

// The Edge Function success envelope (index.ts returns the inserted row).
const AnalyzeEnvelopeSchema = z.object({
  analysis: StoredAnalysisSchema,
});

function toIssue(issue: z.infer<typeof StoredIssueSchema>): SwingIssue {
  return {
    name: issue.name,
    severity: issue.severity,
    frameIndex: issue.frame_index,
    description: issue.description,
    fix: issue.fix,
  };
}

function toAnalysis(row: StoredAnalysis): SwingAnalysis {
  return {
    score: row.swing_score,
    summary: row.coaching_text,
    issues: row.issues.map(toIssue),
    positives: row.positives,
    drill: row.drill,
  };
}

/** Validate + map a cached `analyses` row. Returns null on a schema miss so
 *  a malformed cache row degrades to a re-analysis rather than a crash. */
export function parseStoredAnalysis(raw: unknown): SwingAnalysis | null {
  const parsed = StoredAnalysisSchema.safeParse(raw);
  return parsed.success ? toAnalysis(parsed.data) : null;
}

/** Validate + map the Edge Function response envelope. Null on a schema miss
 *  (the caller surfaces an "invalid response" error + can retry). */
export function parseAnalyzeEnvelope(raw: unknown): SwingAnalysis | null {
  const parsed = AnalyzeEnvelopeSchema.safeParse(raw);
  return parsed.success ? toAnalysis(parsed.data.analysis) : null;
}

// ───── Error mapping ───────────────────────────────────────────────────────

export type AnalysisErrorCode =
  | 'network'
  | 'rate_limited'
  | 'invalid_response'
  | 'not_found'
  | 'unauthenticated'
  | 'unknown';

export interface AnalysisError {
  code: AnalysisErrorCode;
  /** User-facing message (AI_IMPLEMENTATION_GUIDE §11 error table). */
  message: string;
  /** Whether a "Try again" CTA should be offered. */
  retryable: boolean;
}

/**
 * Map an Edge Function error `code` (the `{ error: { code } }` body from
 * supabase/functions/analyze-swing/index.ts) to a user-facing AnalysisError.
 * Unrecognised codes fall back to a generic retryable failure.
 */
export function mapFunctionError(code: string | undefined): AnalysisError {
  switch (code) {
    case 'rate_limited':
      return {
        code: 'rate_limited',
        message: "You've used all 10 analyses for today. Come back tomorrow.",
        retryable: false,
      };
    case 'unauthorized':
      return {
        code: 'unauthenticated',
        message: 'Your session expired. Sign in and try again.',
        retryable: false,
      };
    case 'parse_error':
    case 'schema_error':
      return {
        code: 'invalid_response',
        message: 'Something went wrong processing your analysis. Try again.',
        retryable: true,
      };
    case 'upstream_error':
      return {
        code: 'unknown',
        message: 'The analysis service is busy right now. Please try again.',
        retryable: true,
      };
    case 'bad_request':
      return {
        code: 'unknown',
        message: "This swing couldn't be analysed. Try a different one.",
        retryable: false,
      };
    case 'config_error':
    case 'db_error':
    default:
      return {
        code: 'unknown',
        message: 'Analysis failed. Please try again.',
        retryable: true,
      };
  }
}

/** Network failure (request never reached the function). */
export const NETWORK_ERROR: AnalysisError = {
  code: 'network',
  message: 'Analysis timed out. Check your connection and try again.',
  retryable: true,
};
