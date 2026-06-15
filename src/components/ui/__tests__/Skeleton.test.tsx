/**
 * Skeleton — UI tests
 * Just verify it mounts under the Reanimated mock. The shimmer animation
 * itself is worklet-driven; under the mock setup it's a no-op which is
 * exactly the contract we need.
 */

import { render } from '@testing-library/react-native';

import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<Skeleton width={120} height={24} />);
    expect(toJSON()).not.toBeNull();
  });

  it('accepts a borderRadius prop', () => {
    const { toJSON } = render(<Skeleton borderRadius={12} />);
    expect(toJSON()).not.toBeNull();
  });
});
