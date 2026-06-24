/**
 * handicap — Pure helpers
 * Bridge the ProfileScreen inline handicap input (a decimal-pad text field)
 * to the stored value in `profiles.handicap` (numeric, nullable, WHS range
 * -10..54) and back for display.
 *
 * `parseHandicap` is deliberately tri-state so the caller can tell "cleared"
 * apart from "invalid, keep what we had":
 *   - null      → the field was emptied (store null)
 *   - a number  → a valid handicap in range (store it)
 *   - undefined → not a valid handicap (reject; revert the input)
 *
 * Used by: ProfileScreen (inline input), useProfile.
 */

export const MIN_HANDICAP = -10;
export const MAX_HANDICAP = 54;

export function parseHandicap(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return undefined;
  if (value < MIN_HANDICAP || value > MAX_HANDICAP) return undefined;
  // One decimal place, the WHS convention (e.g. 14.2). Math.round avoids
  // binary-float drift like 14.299999999.
  return Math.round(value * 10) / 10;
}

/** Format a stored handicap for the input / identity subtitle. Null → ''. */
export function formatHandicap(value: number | null): string {
  return value == null ? '' : String(value);
}
