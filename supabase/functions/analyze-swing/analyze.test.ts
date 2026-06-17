/**
 * analyze.ts — Deno unit tests
 * Run: `deno test supabase/functions/analyze-swing/`
 */

import { assertEquals } from '@std/assert';
import {
  AnalyzeRequestSchema,
  mapToRow,
  stripCodeFence,
  utcDayStartIso,
} from './analyze.ts';

const validRequest = {
  videoId: '00000000-0000-0000-0000-000000000000',
  frames: Array(8).fill('base64data'),
  cameraAngle: 'face-on',
  clubType: '7-iron',
  swingHand: 'right',
  userSkillLevel: 'intermediate',
};

Deno.test('utcDayStartIso returns UTC midnight of the given day', () => {
  assertEquals(
    utcDayStartIso(new Date('2026-06-17T15:42:10.500Z')),
    '2026-06-17T00:00:00.000Z',
  );
});

Deno.test('stripCodeFence unwraps ```json and bare ``` fences', () => {
  assertEquals(stripCodeFence('```json\n{"a":1}\n```'), '{"a":1}');
  assertEquals(stripCodeFence('```\n{"a":1}\n```'), '{"a":1}');
  assertEquals(stripCodeFence('  {"a":1}  '), '{"a":1}');
});

Deno.test('AnalyzeRequestSchema accepts a well-formed request', () => {
  assertEquals(AnalyzeRequestSchema.safeParse(validRequest).success, true);
});

Deno.test('AnalyzeRequestSchema requires exactly 8 frames', () => {
  assertEquals(
    AnalyzeRequestSchema.safeParse({ ...validRequest, frames: Array(7).fill('x') })
      .success,
    false,
  );
  assertEquals(
    AnalyzeRequestSchema.safeParse({ ...validRequest, frames: Array(9).fill('x') })
      .success,
    false,
  );
});

Deno.test('AnalyzeRequestSchema rejects an unknown swingHand', () => {
  assertEquals(
    AnalyzeRequestSchema.safeParse({ ...validRequest, swingHand: 'both' }).success,
    false,
  );
});

Deno.test('AnalyzeRequestSchema defaults previousIssues + frameRefs to []', () => {
  const parsed = AnalyzeRequestSchema.parse({ ...validRequest, swingHand: 'left' });
  assertEquals(parsed.previousIssues, []);
  assertEquals(parsed.frameRefs, []);
});

Deno.test('mapToRow renames Claude fields to analyses columns', () => {
  const row = mapToRow(
    {
      score: 82,
      summary: 'Solid tempo, slightly across the line at the top.',
      issues: [
        {
          name: 'Across the line',
          severity: 'moderate',
          frame_index: 4,
          description: 'd',
          fix: 'f',
        },
      ],
      positives: ['Good grip', 'Balanced finish'],
      drill: 'Towel-under-arm drill',
    },
    {
      userId: 'user-1',
      videoId: 'video-1',
      modelVersion: 'claude-sonnet-4-6',
      promptVersion: 'v1.0',
      inputTokens: 1200,
      outputTokens: 300,
      frameRefs: ['address', 'top'],
    },
  );

  assertEquals(row.swing_score, 82); // score → swing_score
  assertEquals(row.coaching_text, 'Solid tempo, slightly across the line at the top.'); // summary → coaching_text
  assertEquals(row.positives, ['Good grip', 'Balanced finish']);
  assertEquals(row.drill, 'Towel-under-arm drill');
  assertEquals(row.input_tokens, 1200);
  assertEquals(row.output_tokens, 300);
  assertEquals(row.model_version, 'claude-sonnet-4-6');
  assertEquals(row.prompt_version, 'v1.0');
  assertEquals(row.frame_refs, ['address', 'top']);
  assertEquals(row.user_id, 'user-1');
  assertEquals(row.video_id, 'video-1');
});
