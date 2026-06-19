/**
 * OrientationBootstrap — Component test
 * Locks portrait once on mount and renders nothing.
 */

import { render } from '@testing-library/react-native';

import { OrientationBootstrap } from '../OrientationBootstrap';
import { lockPortrait } from '@/core/orientation';

jest.mock('@/core/orientation', () => ({
  lockPortrait: jest.fn(),
  unlockOrientation: jest.fn(),
}));

describe('OrientationBootstrap', () => {
  it('locks portrait on mount and renders nothing', () => {
    const { toJSON } = render(<OrientationBootstrap />);
    expect(lockPortrait).toHaveBeenCalledTimes(1);
    expect(toJSON()).toBeNull();
  });
});
