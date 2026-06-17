/**
 * schema.ts — Deno unit tests
 * Guards the model-output contract that gates a row insert.
 * Run: `deno test supabase/functions/analyze-swing/`
 */

import { assertEquals } from '@std/assert';
import { SwingAnalysisSchema } from './schema.ts';

const valid = {
  score: 80,
  summary: 'A clear, specific two-sentence read of the swing for the coach voice.',
  issues: [
    {
      name: 'Flying right elbow',
      severity: 'moderate',
      frame_index: 4,
      description: 'The trail elbow separates from the body at the top.',
      fix: 'Keep the trail elbow connected through the takeaway.',
    },
  ],
  positives: ['Great balance through impact'],
  drill: 'Towel-under-arm drill',
};

Deno.test('accepts a well-formed analysis', () => {
  assertEquals(SwingAnalysisSchema.safeParse(valid).success, true);
});

Deno.test('rejects a score outside 0–100', () => {
  assertEquals(SwingAnalysisSchema.safeParse({ ...valid, score: 130 }).success, false);
  assertEquals(SwingAnalysisSchema.safeParse({ ...valid, score: -1 }).success, false);
});

Deno.test('rejects a non-integer score', () => {
  assertEquals(SwingAnalysisSchema.safeParse({ ...valid, score: 80.5 }).success, false);
});

Deno.test('rejects frame_index above 7', () => {
  assertEquals(
    SwingAnalysisSchema.safeParse({
      ...valid,
      issues: [{ ...valid.issues[0], frame_index: 9 }],
    }).success,
    false,
  );
});

Deno.test('rejects an unknown severity', () => {
  assertEquals(
    SwingAnalysisSchema.safeParse({
      ...valid,
      issues: [{ ...valid.issues[0], severity: 'critical' }],
    }).success,
    false,
  );
});

Deno.test('requires 1–3 positives', () => {
  assertEquals(SwingAnalysisSchema.safeParse({ ...valid, positives: [] }).success, false);
  assertEquals(
    SwingAnalysisSchema.safeParse({ ...valid, positives: ['a', 'b', 'c', 'd'] }).success,
    false,
  );
});

Deno.test('allows an empty issues array (a clean swing)', () => {
  assertEquals(SwingAnalysisSchema.safeParse({ ...valid, issues: [] }).success, true);
});
