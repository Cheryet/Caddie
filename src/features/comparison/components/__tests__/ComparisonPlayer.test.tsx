/**
 * ComparisonPlayer — Component test
 * Two empty panels (no video lib needed) — verifies both slots render and
 * each routes to its own picker.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { ComparisonPlayer } from '../ComparisonPlayer';
import type { ComparePanelState } from '../../types';

const emptyPanel = (): ComparePanelState => ({
  videoId: null,
  status: 'empty',
  uri: null,
  label: null,
  isPlaying: false,
  currentMs: 0,
  durationMs: 0,
  rate: 0.5,
  play: jest.fn(),
  pause: jest.fn(),
  toggle: jest.fn(),
  seekMs: jest.fn(),
  setRate: jest.fn(),
  setProgress: jest.fn(),
  setDuration: jest.fn(),
  onEnd: jest.fn(),
  impactMs: null,
  markImpact: jest.fn(),
  poseAvailable: false,
  poseEnabled: false,
  togglePose: jest.fn(),
  poseFrame: null,
  poseTrackStatus: 'idle',
  poseElapsedSec: 0,
});

describe('ComparisonPlayer', () => {
  it('renders both slots, the sync strip, and routes each picker', () => {
    const onPickA = jest.fn();
    const onPickB = jest.fn();
    const { getByLabelText, getByText } = render(
      <ComparisonPlayer
        panelA={emptyPanel()}
        panelB={emptyPanel()}
        playerRefA={null}
        playerRefB={null}
        onPickA={onPickA}
        onPickB={onPickB}
        syncOn={false}
        canSync={false}
        onToggleSync={jest.fn()}
      />,
    );
    expect(getByText('Sync')).toBeTruthy();
    fireEvent.press(getByLabelText('Pick Swing A'));
    fireEvent.press(getByLabelText('Pick Swing B'));
    expect(onPickA).toHaveBeenCalledTimes(1);
    expect(onPickB).toHaveBeenCalledTimes(1);
  });
});
