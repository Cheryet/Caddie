/**
 * mockAnalysis — Phase 4.3 scaffold
 * A realistic SwingAnalysis (and score subtitle) so AnalysisScreen renders
 * its "ready" state with representative content before the data layer exists.
 * Content mirrors Design/Caddie Screens.dc.html §03 (score 78, three ranked
 * faults, three positives, a drill).
 *
 * REMOVE in Phase 4.4 — the `useAnalysis` hook replaces this with the cached
 * `analyses` row / Edge Function response. Nothing in production should import
 * this module.
 *
 * Part of: src/features/analysis/
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

/** Score subtitle (club · relative date) — sourced from the video in 4.4. */
export const MOCK_SUBTITLE = 'Driver · Today';
