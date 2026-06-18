/**
 * analysis fixtures — Test data
 * Shared sample data for the analysis tests: the `SwingAnalysis` domain
 * object, the equivalent stored `analyses` row (snake_case, as Postgres /
 * the Edge Function returns it), and the function envelope. Lives under
 * __fixtures__ (not __tests__) so Jest doesn't treat it as a suite.
 *
 * NOT imported by production code — the screen renders real data via
 * useAnalysis (Phase 4.4). Replaces the former src/features/analysis/
 * mockAnalysis.ts.
 */

import type { SwingAnalysis } from '@/types/analysis';

export const MOCK_ANALYSIS: SwingAnalysis = {
  score: 78,
  summary:
    "Smooth, repeatable tempo and genuinely good width at the top — there's a lot to like here. The one thing costing you strokes is the trail elbow flying at the top; tidy that and the strike steps up a grade.",
  issues: [
    {
      name: 'Trail elbow flying at the top',
      severity: 'major',
      frameIndex: 3,
      description:
        'Your trail arm separates from your body at the top of the backswing, steepening the downswing.',
      fix: 'Tuck it on the way down — you’ll catch it flush far more often.',
    },
    {
      name: 'Hips sliding, not turning',
      severity: 'moderate',
      frameIndex: 2,
      description:
        'Your lower body drifts toward the target on the backswing instead of rotating.',
      fix: 'Feel like you’re turning into a wall just behind you going back.',
    },
    {
      name: 'Grip is a touch strong',
      severity: 'minor',
      frameIndex: 0,
      description:
        'Both hands sit slightly under the club, which can shut the face.',
      fix: 'Only worth a look if your misses start leaking left.',
    },
  ],
  positives: [
    'Tempo is smooth and repeatable — about 3.1 to 1',
    'Great width at the top of the backswing',
    'Head stays dead still through impact',
  ],
  drill:
    'Towel under the trail arm — keeps the elbow connected through the strike. 4 minutes, 3 reps.',
};

export const MOCK_SUBTITLE = 'Driver · Today';

/** The same analysis as a stored `analyses` row (snake_case columns). */
export const mockAnalysisRow = {
  swing_score: 78,
  coaching_text: MOCK_ANALYSIS.summary,
  issues: MOCK_ANALYSIS.issues.map(issue => ({
    name: issue.name,
    severity: issue.severity,
    frame_index: issue.frameIndex,
    description: issue.description,
    fix: issue.fix,
  })),
  positives: MOCK_ANALYSIS.positives,
  drill: MOCK_ANALYSIS.drill,
  created_at: '2026-06-17T12:00:00.000Z',
};

/** The `analyze-swing` success envelope (index.ts returns the inserted row). */
export const mockAnalysisEnvelope = {
  analysis: mockAnalysisRow,
  usage: { input_tokens: 1800, output_tokens: 420 },
  model_version: 'claude-sonnet-4-6',
  prompt_version: 'v1.0',
};
