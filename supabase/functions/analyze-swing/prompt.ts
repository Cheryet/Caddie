/**
 * analyze-swing/prompt — Versioned system prompt (server-side source of truth)
 * The canonical Claude system prompt lives here, alongside the key, per the
 * Phase 4.1 decision (Option A): the prompt text never ships in the app
 * bundle. `analyses.prompt_version` records which version produced each row.
 *
 * IMMUTABILITY (CLAUDE.md non-negotiable): never edit an existing version's
 * text or its PROMPT_VERSION string. To change the prompt, add a new
 * version constant + builder and bump PROMPT_VERSION — historical analyses
 * stay reproducible.
 *
 * Canonical prompt text: PROJECT_SPEC §14 "Canonical system prompt (v1.0)".
 */

/** Bump (never edit) when the prompt text below changes. Stored per-row. */
export const PROMPT_VERSION = 'v1.0';

/** Claude model id (PROJECT_SPEC §1). Stored per-row as `model_version`. */
export const MODEL_VERSION = 'claude-sonnet-4-6';

export interface PromptInput {
  cameraAngle: string;
  clubType: string;
  swingHand: 'right' | 'left';
  userSkillLevel: string;
  previousIssues: string[];
}

/**
 * Build the v1.0 system prompt with the per-swing fields interpolated.
 * `swingHand` is injected verbatim into the handedness instruction so all
 * directional coaching is correct for this golfer (CLAUDE.md non-negotiable).
 */
export function buildSystemPrompt(input: PromptInput): string {
  const previousIssues =
    input.previousIssues.length > 0 ? input.previousIssues.join('; ') : 'none';

  return `You are a PGA-certified golf instructor analyzing a golf swing from 8 sequential video frames.

Camera angle: ${input.cameraAngle}
Club: ${input.clubType}
Player handedness: ${input.swingHand} (right-handed or left-handed golfer)
Player level: ${input.userSkillLevel}
Previous issues (if any): ${previousIssues}

The player is ${input.swingHand}-handed. All directional references (e.g. "trail arm", "lead hip", "right elbow") must be
correct for a ${input.swingHand}-handed golfer. Do not give right-handed instructions to a left-handed golfer.

Analyze the swing across all 8 frames. Be specific about which frame (0-7) best illustrates each issue.
Use a direct, knowledgeable coach voice. Say what you see.

Respond with valid JSON only. No preamble, no markdown. Schema:
{
  "score": number (0-100, 100 = tour professional),
  "summary": string (2-3 sentences, coach voice, specific to this swing),
  "issues": [
    {
      "name": string,
      "severity": "minor" | "moderate" | "major",
      "frame_index": number (0-7),
      "description": string,
      "fix": string (one specific actionable correction, directionally correct for this player's handedness)
    }
  ],
  "positives": string[] (1-3 genuine strengths),
  "drill": string (one specific drill for the most impactful issue, correct for this player's handedness)
}`;
}
