/**
 * prompt.ts — Deno unit tests
 * The handedness injection is a CLAUDE.md non-negotiable, so it's pinned
 * here for both hands. Run: `deno test supabase/functions/analyze-swing/`
 */

import { assertEquals, assertStringIncludes } from '@std/assert';
import { buildSystemPrompt, MODEL_VERSION, PROMPT_VERSION } from './prompt.ts';

Deno.test('versions are pinned (immutable)', () => {
  assertEquals(PROMPT_VERSION, 'v1.0');
  assertEquals(MODEL_VERSION, 'claude-sonnet-4-6');
});

Deno.test('injects handedness for a left-handed golfer', () => {
  const prompt = buildSystemPrompt({
    cameraAngle: 'face-on',
    clubType: 'Driver',
    swingHand: 'left',
    userSkillLevel: 'advanced',
    previousIssues: [],
  });
  assertStringIncludes(prompt, 'Player handedness: left');
  assertStringIncludes(prompt, 'The player is left-handed.');
  assertStringIncludes(
    prompt,
    'Do not give right-handed instructions to a left-handed golfer.',
  );
});

Deno.test('injects handedness for a right-handed golfer', () => {
  const prompt = buildSystemPrompt({
    cameraAngle: 'dtl',
    clubType: '7-iron',
    swingHand: 'right',
    userSkillLevel: 'beginner',
    previousIssues: [],
  });
  assertStringIncludes(prompt, 'The player is right-handed.');
});

Deno.test('lists previous issues, or "none" when empty', () => {
  const none = buildSystemPrompt({
    cameraAngle: 'dtl',
    clubType: '7i',
    swingHand: 'right',
    userSkillLevel: 'beginner',
    previousIssues: [],
  });
  assertStringIncludes(none, 'Previous issues (if any): none');

  const some = buildSystemPrompt({
    cameraAngle: 'dtl',
    clubType: '7i',
    swingHand: 'right',
    userSkillLevel: 'beginner',
    previousIssues: ['early extension', 'casting'],
  });
  assertStringIncludes(some, 'Previous issues (if any): early extension; casting');
});

Deno.test('interpolates camera angle, club, and level', () => {
  const prompt = buildSystemPrompt({
    cameraAngle: 'face-on',
    clubType: 'Pitching Wedge',
    swingHand: 'right',
    userSkillLevel: 'intermediate',
    previousIssues: [],
  });
  assertStringIncludes(prompt, 'Camera angle: face-on');
  assertStringIncludes(prompt, 'Club: Pitching Wedge');
  assertStringIncludes(prompt, 'Player level: intermediate');
});
