/**
 * core/orientation — wrapper tests
 * Verifies the thin wrapper delegates to react-native-orientation-locker
 * (globally mocked in jest.setup).
 */

import Orientation from 'react-native-orientation-locker';

import { lockPortrait, unlockOrientation } from '../index';

describe('core/orientation', () => {
  it('locks to portrait', () => {
    lockPortrait();
    expect(Orientation.lockToPortrait).toHaveBeenCalled();
  });

  it('unlocks all orientations', () => {
    unlockOrientation();
    expect(Orientation.unlockAllOrientations).toHaveBeenCalled();
  });
});
