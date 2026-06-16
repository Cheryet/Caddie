/**
 * PoseBootstrap — Component tests
 * The bootstrap renders nothing; the only assertion that matters is
 * that mounting it triggers initPose exactly once.
 */

import { render } from '@testing-library/react-native';

jest.mock('@/core/pose', () => ({
  initPose: jest.fn().mockResolvedValue(undefined),
}));

const pose = require('@/core/pose') as { initPose: jest.Mock };
const { PoseBootstrap } = require('../PoseBootstrap');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PoseBootstrap', () => {
  it('renders nothing', () => {
    const { toJSON } = render(<PoseBootstrap />);
    expect(toJSON()).toBeNull();
  });

  it('fires initPose on mount', () => {
    render(<PoseBootstrap />);
    expect(pose.initPose).toHaveBeenCalledTimes(1);
  });
});
