/**
 * Badge — UI tests
 * Verifies label rendering and that each variant renders without error.
 * Visual values (specific hex codes) are not asserted — DESIGN_SYSTEM.md
 * is the source of truth and we'd just duplicate it here.
 */

import { render } from '@testing-library/react-native';

import type { BadgeVariant } from '../Badge';
import { Badge } from '../Badge';

const VARIANTS: BadgeVariant[] = [
  'gold',
  'success',
  'warning',
  'error',
  'neutral',
];

describe('Badge', () => {
  it('renders its label', () => {
    const { queryByText } = render(<Badge label="Driver" />);
    expect(queryByText('Driver')).not.toBeNull();
  });

  it.each(VARIANTS)('renders %s variant', variant => {
    const { queryByText } = render(<Badge label="X" variant={variant} />);
    expect(queryByText('X')).not.toBeNull();
  });

  it('renders the sm size without error', () => {
    const { queryByText } = render(<Badge label="X" size="sm" />);
    expect(queryByText('X')).not.toBeNull();
  });
});
