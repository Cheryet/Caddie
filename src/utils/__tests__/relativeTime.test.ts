/**
 * relativeTime — Unit tests
 * Pure tests, no mocks. `now` is injected per case so results don't
 * depend on the wall clock.
 */

import { formatRelativeDate } from '../relativeTime';

const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('formatRelativeDate', () => {
  it('returns empty string for nullish input', () => {
    expect(formatRelativeDate(null, NOW)).toBe('');
    expect(formatRelativeDate(undefined, NOW)).toBe('');
    expect(formatRelativeDate('', NOW)).toBe('');
  });

  it('returns empty string for malformed input', () => {
    expect(formatRelativeDate('not-a-date', NOW)).toBe('');
  });

  it('collapses the last 60s to "Just now"', () => {
    expect(formatRelativeDate('2026-06-15T11:59:30.000Z', NOW)).toBe('Just now');
  });

  it('formats hours-ago consistently', () => {
    const out = formatRelativeDate('2026-06-15T09:00:00.000Z', NOW);
    expect(out).toMatch(/3 hours ago/);
  });

  it('formats days-ago consistently', () => {
    const out = formatRelativeDate('2026-06-13T12:00:00.000Z', NOW);
    expect(out).toMatch(/2 days ago/);
  });
});
