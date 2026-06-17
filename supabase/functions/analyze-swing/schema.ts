/**
 * analyze-swing/schema — Claude output contract (server-side)
 * The Zod schema the Edge Function validates Claude's JSON against before
 * trusting or storing it. Mirrors PROJECT_SPEC §14 "Response validation
 * (Zod)" exactly. This is the *model-output* schema — distinct from the
 * app-side API-envelope schema added in Phase 4.4 (the two validate
 * different things: server validates Claude, app validates the function).
 */

import { z } from 'zod';

export const SwingIssueSchema = z.object({
  name: z.string(),
  severity: z.enum(['minor', 'moderate', 'major']),
  frame_index: z.number().int().min(0).max(7),
  description: z.string(),
  fix: z.string(),
});

export const SwingAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  summary: z.string().min(10),
  issues: z.array(SwingIssueSchema),
  positives: z.array(z.string()).min(1).max(3),
  drill: z.string(),
});

export type SwingIssue = z.infer<typeof SwingIssueSchema>;
export type SwingAnalysis = z.infer<typeof SwingAnalysisSchema>;
