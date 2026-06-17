/**
 * scoreBracket — Unit tests
 * Locks the DESIGN_SYSTEM §5 bracket boundaries and the bracket→colour
 * mapping (theme tokens), plus clamping of out-of-contract scores.
 */

import { scoreBracket } from '../scoreBracket';
import { colors } from '@/theme';

describe('scoreBracket', () => {
  it.each([
    [0, 'Poor', colors.semantic.error],
    [39, 'Poor', colors.semantic.error],
    [40, 'Fair', colors.semantic.warning],
    [59, 'Fair', colors.semantic.warning],
    [60, 'Good', colors.semantic.info],
    [74, 'Good', colors.semantic.info],
    [75, 'Great', colors.semantic.success],
    [89, 'Great', colors.semantic.success],
    [90, 'Excellent', colors.gold.default],
    [100, 'Excellent', colors.gold.default],
  ])('score %i → %s', (score, label, color) => {
    const bracket = scoreBracket(score);
    expect(bracket.label).toBe(label);
    expect(bracket.color).toBe(color);
  });

  it('clamps scores below 0 to Poor', () => {
    expect(scoreBracket(-10).label).toBe('Poor');
  });

  it('clamps scores above 100 to Excellent', () => {
    expect(scoreBracket(150).label).toBe('Excellent');
  });

  it('treats NaN as the lowest bracket', () => {
    expect(scoreBracket(NaN).label).toBe('Poor');
  });
});
