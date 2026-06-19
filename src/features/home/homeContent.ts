/**
 * homeContent — Pure helpers
 * The two derived header strings on HomeScreen: the contextual date line
 * and the personalised greeting headline. Pure (same input → same output)
 * so they unit-test in isolation and the screen stays composition-only.
 *
 * Design note: the prototype header reads "Friday · 18°, light crosswind"
 * over "Let's sharpen that driver, Marcus". Weather isn't in our stack, so
 * the context line is the real date rather than fabricated conditions; the
 * headline derives the club from the user's latest swing.
 *
 * Used by: HomeScreen.
 */

import { format } from 'date-fns';

/** "Friday · June 19" — today's date, the honest stand-in for the
 *  prototype's weather strap-line. */
export function buildContextLine(now: Date = new Date()): string {
  return format(now, 'EEEE · MMMM d');
}

/**
 * The big greeting headline.
 *   - With a recent club:  "Let's sharpen that driver, Marcus"
 *   - No swings yet:        "Ready when you are, Marcus"
 *
 * The club is lower-cased so it reads as a sentence (DESIGN_SYSTEM §3 —
 * sentence case everywhere). `name` is effectively always present
 * (profiles.username is NOT NULL); the trim guard just avoids a dangling
 * comma if it's ever blank.
 */
export function buildGreetingHeadline(
  name: string,
  featuredClub: string | null,
): string {
  const trimmedName = name.trim();
  const suffix = trimmedName ? `, ${trimmedName}` : '';
  const club = featuredClub?.trim();
  if (club) {
    return `Let's sharpen that ${club.toLowerCase()}${suffix}`;
  }
  return `Ready when you are${suffix}`;
}
