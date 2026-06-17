/**
 * scoreBracket — Pure util
 * Maps a 0–100 swing score to its display bracket: the label shown under
 * the ring and the color the ring + label use. Brackets are verbatim from
 * DESIGN_SYSTEM.md §5 (SwingScore): Poor / Fair / Good / Great / Excellent.
 *
 * Color note (deliberate, see TODO.md): the design system's SwingScore spec
 * text says "gold ring", but the high-fidelity prototype colours the ring by
 * BRACKET instead — gold is reserved for the screen's single CTA so it stays
 * "used once per screen" (DESIGN_SYSTEM §1). We follow the prototype; every
 * colour below is still a theme token.
 *
 * Pure: same score → same bracket. Tested in isolation.
 * Used by: SwingScore (ring + label).
 */

import { colors } from '@/theme';

export interface ScoreBracket {
  /** Stable identifier for the bracket. */
  key: 'poor' | 'fair' | 'good' | 'great' | 'excellent';
  /** Sentence-case label; the component applies the overline uppercase. */
  label: string;
  /** Ring stroke + label colour — a theme token. */
  color: string;
}

interface BracketDef extends ScoreBracket {
  /** Inclusive lower bound; the bracket runs up to the next one's bound. */
  min: number;
}

// Ordered high → low so the first `score >= min` match wins.
const BRACKETS: readonly BracketDef[] = [
  { min: 90, key: 'excellent', label: 'Excellent', color: colors.gold.default },
  { min: 75, key: 'great', label: 'Great', color: colors.semantic.success },
  { min: 60, key: 'good', label: 'Good', color: colors.semantic.info },
  { min: 40, key: 'fair', label: 'Fair', color: colors.semantic.warning },
  { min: 0, key: 'poor', label: 'Poor', color: colors.semantic.error },
] as const;

/** Clamp to the valid 0–100 range so out-of-contract scores still resolve. */
function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

export function scoreBracket(score: number): ScoreBracket {
  const clamped = clampScore(score);
  // The final bracket has min 0, so a match is guaranteed.
  const match = BRACKETS.find(b => clamped >= b.min) ?? BRACKETS[BRACKETS.length - 1]!;
  return { key: match.key, label: match.label, color: match.color };
}
