/**
 * SwingPhaseStrip — Component tests
 * Verifies the strip labels the referenced canonical position with its name
 * and 1-based ordinal, for representative indices across the swing.
 */

import { render } from '@testing-library/react-native';

import { SwingPhaseStrip } from '../SwingPhaseStrip';

describe('SwingPhaseStrip', () => {
  it('labels the top of the backswing (index 3)', () => {
    const { getByText } = render(<SwingPhaseStrip frameIndex={3} />);
    expect(getByText('Top · 4 of 8')).toBeTruthy();
  });

  it('labels address (index 0) and finish (index 7)', () => {
    const { getByText, rerender } = render(<SwingPhaseStrip frameIndex={0} />);
    expect(getByText('Address · 1 of 8')).toBeTruthy();
    rerender(<SwingPhaseStrip frameIndex={7} />);
    expect(getByText('Finish · 8 of 8')).toBeTruthy();
  });
});
