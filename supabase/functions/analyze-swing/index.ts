/**
 * analyze-swing — Supabase Edge Function (Claude Vision proxy)
 * PROJECT_SPEC §14 + §22 Phase 4.1. The ONLY place the Anthropic API key
 * is ever touched — it lives as a Supabase secret (`ANTHROPIC_API_KEY`)
 * and never ships in the app bundle.
 *
 * Pipeline: validate JWT (RLS-scoped client) → enforce 10/day per-user
 * limit → call Claude Vision with the versioned prompt → validate the
 * JSON (Zod) → persist the analysis with token counts → return it.
 *
 * Runtime: Deno (npm:/jsr: specifiers, .ts imports). Linted/tested with
 * `deno lint` / `deno test`, NOT the app's ESLint/Jest (see the repo
 * tsconfig/eslint/jest excludes for `supabase/`).
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

import { corsHeaders } from '../_shared/cors.ts';
import { SwingAnalysisSchema } from './schema.ts';
import { buildSystemPrompt, MODEL_VERSION, PROMPT_VERSION } from './prompt.ts';
import {
  AnalyzeRequestSchema,
  DAILY_LIMIT,
  mapToRow,
  stripCodeFence,
  utcDayStartIso,
} from './analyze.ts';

const MAX_TOKENS = 1500;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return fail('method_not_allowed', 'Use POST.', 405);
  }

  // ── Auth: a user-scoped client (RLS) built from the caller's JWT ────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return fail('unauthorized', 'Missing Authorization header.', 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return fail('config_error', 'Server is misconfigured.', 500);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return fail('unauthorized', 'Invalid or expired session.', 401);
  }
  const userId = userData.user.id;

  // ── Validate the request body ───────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('bad_request', 'Body must be JSON.', 400);
  }
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail('bad_request', 'Invalid analysis request payload.', 400);
  }
  const input = parsed.data;

  // ── Daily limit — RLS scopes the count to this user's own rows ──────────
  const { count, error: countErr } = await supabase
    .from('analyses')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', utcDayStartIso());
  if (countErr) {
    return fail('db_error', 'Could not check usage.', 500);
  }
  if ((count ?? 0) >= DAILY_LIMIT) {
    return fail(
      'rate_limited',
      `Daily limit of ${DAILY_LIMIT} analyses reached. Try again tomorrow.`,
      429,
    );
  }

  // ── Claude Vision ───────────────────────────────────────────────────────
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return fail('config_error', 'Analysis is not configured.', 500);
  }
  const anthropic = new Anthropic({ apiKey });

  const system = buildSystemPrompt({
    cameraAngle: input.cameraAngle,
    clubType: input.clubType,
    swingHand: input.swingHand,
    userSkillLevel: input.userSkillLevel,
    previousIssues: input.previousIssues,
  });

  const content = [
    ...input.frames.map((data) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/jpeg' as const,
        data,
      },
    })),
    {
      type: 'text' as const,
      text: 'Analyze this swing across all 8 frames and respond with JSON only.',
    },
  ];

  let message: Anthropic.Message;
  try {
    message = await anthropic.messages.create({
      model: MODEL_VERSION,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: 'user', content }],
    });
  } catch {
    return fail('upstream_error', 'Analysis service failed. Please try again.', 502);
  }

  // ── Parse + validate the model's JSON before trusting it ────────────────
  const textBlock = message.content.find((block) => block.type === 'text');
  const rawText = textBlock && textBlock.type === 'text' ? textBlock.text : '';
  let modelJson: unknown;
  try {
    modelJson = JSON.parse(stripCodeFence(rawText));
  } catch {
    return fail('parse_error', 'Model returned malformed output.', 502);
  }
  const result = SwingAnalysisSchema.safeParse(modelJson);
  if (!result.success) {
    return fail('schema_error', 'Model output failed validation.', 502);
  }

  // ── Persist (token tracking) ────────────────────────────────────────────
  const row = mapToRow(result.data, {
    userId,
    videoId: input.videoId,
    modelVersion: MODEL_VERSION,
    promptVersion: PROMPT_VERSION,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    frameRefs: input.frameRefs,
  });

  const { data: inserted, error: insErr } = await supabase
    .from('analyses')
    .insert(row)
    .select()
    .single();
  if (insErr) {
    return fail('db_error', 'Could not save the analysis.', 500);
  }

  // Best-effort usage bookkeeping — never fail the response on these.
  await supabase
    .from('videos')
    .update({ has_analysis: true })
    .eq('id', input.videoId);
  const { data: profile } = await supabase
    .from('profiles')
    .select('analyses_run')
    .eq('id', userId)
    .single();
  if (profile) {
    await supabase
      .from('profiles')
      .update({ analyses_run: (profile.analyses_run ?? 0) + 1 })
      .eq('id', userId);
  }

  return json({
    analysis: inserted,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
    },
    model_version: MODEL_VERSION,
    prompt_version: PROMPT_VERSION,
  });
});
