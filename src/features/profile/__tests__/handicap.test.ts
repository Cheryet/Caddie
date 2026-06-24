/**
 * handicap — Unit tests
 * The string ⇆ number|null bridge for the inline handicap input, including
 * its tri-state parse (null = cleared, undefined = invalid/keep).
 */

import { formatHandicap, parseHandicap } from '../handicap';

describe('parseHandicap', () => {
  it('returns null for an empty or whitespace field', () => {
    expect(parseHandicap('')).toBeNull();
    expect(parseHandicap('   ')).toBeNull();
  });

  it('parses a valid handicap and rounds to one decimal', () => {
    expect(parseHandicap('14.2')).toBe(14.2);
    expect(parseHandicap('0')).toBe(0);
    expect(parseHandicap('12.34')).toBe(12.3);
  });

  it('accepts the WHS range bounds, including plus handicaps', () => {
    expect(parseHandicap('-10')).toBe(-10);
    expect(parseHandicap('54')).toBe(54);
  });

  it('rejects out-of-range or non-numeric input as undefined', () => {
    expect(parseHandicap('55')).toBeUndefined();
    expect(parseHandicap('-11')).toBeUndefined();
    expect(parseHandicap('abc')).toBeUndefined();
  });
});

describe('formatHandicap', () => {
  it('formats null as an empty string', () => {
    expect(formatHandicap(null)).toBe('');
  });

  it('formats numbers without a trailing .0', () => {
    expect(formatHandicap(14)).toBe('14');
    expect(formatHandicap(14.2)).toBe('14.2');
  });
});
