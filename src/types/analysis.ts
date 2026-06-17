/**
 * analysis — Domain types
 * The app-side shape of a swing analysis as rendered on AnalysisScreen.
 * Field names mirror the Claude output contract (PROJECT_SPEC §14 +
 * supabase/functions/analyze-swing/schema.ts) — `score`, `summary`,
 * `issues`, `positives`, `drill` — NOT the `analyses` table column names
 * (`swing_score`, `coaching_text`, …). The Phase 4.4 `useAnalysis` hook
 * maps a DB row onto this type; the UI only ever sees this shape.
 *
 * The matching Zod runtime validator is deliberately deferred to Phase 4.4
 * (where the hook validates the Edge Function envelope) — Phase 4.3 renders
 * from a typed mock, so the compile-time type is all the screen needs.
 *
 * Used by: src/features/analysis/* (components, screen, mock).
 */

/** Issue severity, lowest → highest impact. Maps to colors.severity.* and,
 *  via IssueCard, to the Badge success/warning/error variants. */
export type IssueSeverity = 'minor' | 'moderate' | 'major';

export interface SwingIssue {
  /** Short fault name, e.g. "Flying right elbow". */
  name: string;
  severity: IssueSeverity;
  /** 0–7 — which canonical frame best illustrates the fault (Address→Finish).
   *  Carried for the Phase 4.4 frame-thumbnail wiring; unused in 4.3. */
  frameIndex: number;
  /** What's happening / why it costs strokes. */
  description: string;
  /** One actionable correction, directionally correct for the player's hand. */
  fix: string;
}

export interface SwingAnalysis {
  /** 0–100, 100 = tour professional. Drives SwingScore + its bracket. */
  score: number;
  /** 2–3 sentence coach-voice summary (the `coaching_text` column). */
  summary: string;
  /** Ranked faults; IssueList orders them major → minor for display. */
  issues: SwingIssue[];
  /** 1–3 genuine strengths ("What's already working"). */
  positives: string[];
  /** One drill for the most impactful issue. */
  drill: string;
}
