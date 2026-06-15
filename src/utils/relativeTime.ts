/**
 * relativeTime — Utility
 * Single source of truth for the short relative-time strings that appear
 * under every video card ("3h ago", "Yesterday", "2 days ago"). Wraps
 * `date-fns/formatDistanceToNow` so all callers stay phrased the same way
 * and unit tests have one seam to validate.
 *
 * Edge cases:
 *   - Invalid ISO strings return an empty string rather than throwing —
 *     a card with a missing date should fail soft (the row is still
 *     navigable; we just don't render a date).
 *   - "now" / very-recent (< 60s) is collapsed to "Just now" because
 *     `formatDistanceToNow` reads "less than a minute ago" which is
 *     verbose for a thumbnail caption.
 */

import { formatDistance, isValid, parseISO } from 'date-fns';

const RECENT_THRESHOLD_MS = 60_000;

export function formatRelativeDate(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return '';
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return '';

  if (now.getTime() - parsed.getTime() < RECENT_THRESHOLD_MS) {
    return 'Just now';
  }

  return formatDistance(parsed, now, { addSuffix: true });
}
