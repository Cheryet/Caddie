/**
 * homeContent — Unit tests
 * Locks the greeting headline rules (club casing + name suffix fallbacks)
 * and the context date line on a fixed date.
 */

import { buildContextLine, buildGreetingHeadline } from '../homeContent';

describe('buildContextLine', () => {
  it('formats the weekday and date', () => {
    // Local noon avoids any timezone shifting the weekday.
    expect(buildContextLine(new Date('2026-06-19T12:00:00'))).toBe(
      'Friday · June 19',
    );
  });
});

describe('buildGreetingHeadline', () => {
  it('uses the featured club, lower-cased, in a sentence', () => {
    expect(buildGreetingHeadline('Marcus', 'Driver')).toBe(
      "Let's sharpen that driver, Marcus",
    );
  });

  it('falls back when there is no club yet', () => {
    expect(buildGreetingHeadline('Marcus', null)).toBe(
      'Ready when you are, Marcus',
    );
  });

  it('omits the name suffix when the name is blank', () => {
    expect(buildGreetingHeadline('  ', null)).toBe('Ready when you are');
    expect(buildGreetingHeadline('', '7 Iron')).toBe(
      "Let's sharpen that 7 iron",
    );
  });
});
