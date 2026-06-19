/**
 * tempoContent — Unit tests
 * Locks BPM clamping, the tempo-term boundaries, and the preset
 * (de)serialisation (including the 0 empty-sentinel round-trip).
 */

import {
  bpmValuesToSlots,
  clampBpm,
  DEFAULT_PRESETS,
  slotsToBpmValues,
  tempoTerm,
} from '../tempoContent';

describe('clampBpm', () => {
  it('rounds to the nearest integer', () => {
    expect(clampBpm(72.4)).toBe(72);
    expect(clampBpm(72.6)).toBe(73);
  });
  it('clamps to the 30–240 range', () => {
    expect(clampBpm(10)).toBe(30);
    expect(clampBpm(500)).toBe(240);
  });
  it('treats NaN as the minimum', () => {
    expect(clampBpm(NaN)).toBe(30);
  });
});

describe('tempoTerm', () => {
  it.each([
    [30, 'Slow'],
    [59, 'Slow'],
    [60, 'Smooth'],
    [77, 'Smooth'],
    [78, 'Balanced'],
    [99, 'Balanced'],
    [100, 'Quick'],
    [131, 'Quick'],
    [132, 'Fast'],
    [240, 'Fast'],
  ])('%i → %s', (bpm, term) => {
    expect(tempoTerm(bpm)).toBe(term);
  });
});

describe('preset (de)serialisation', () => {
  it('maps the 0 sentinel and out-of-range values to empty slots', () => {
    expect(bpmValuesToSlots([66, 0, 84, 0])).toEqual([66, null, 84, null]);
    expect(bpmValuesToSlots([10, 300, 76, 90])).toEqual([null, null, 76, 90]);
  });
  it('pads short / missing arrays to four slots', () => {
    expect(bpmValuesToSlots([90])).toEqual([90, null, null, null]);
    expect(bpmValuesToSlots(null)).toEqual([null, null, null, null]);
  });
  it('serialises empty slots back to the 0 sentinel', () => {
    expect(slotsToBpmValues([66, null, 84, null])).toEqual([66, 0, 84, 0]);
  });
  it('round-trips the default presets', () => {
    expect(bpmValuesToSlots(slotsToBpmValues([...DEFAULT_PRESETS]))).toEqual([
      ...DEFAULT_PRESETS,
    ]);
  });
});
