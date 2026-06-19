/**
 * ComparisonPlayer — Component test
 * Two empty panels (no video lib needed). Verifies both layouts render the
 * Sync control + both slots and route each picker. Wrapped in a
 * SafeAreaProvider because the landscape branch reads insets.
 */

import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ComparisonPlayer, type ComparisonLayout } from '../ComparisonPlayer';
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

function renderWithInsets(node: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      {node}
    </SafeAreaProvider>,
  );
}

function setup(layout: ComparisonLayout) {
  const onPickA = jest.fn();
  const onPickB = jest.fn();
  const view = renderWithInsets(
    <ComparisonPlayer
      layout={layout}
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
  return { ...view, onPickA, onPickB };
}

describe('ComparisonPlayer', () => {
  it.each<ComparisonLayout>(['portrait', 'landscape'])(
    'renders both slots, the Sync control, and routes each picker (%s)',
    layout => {
      const { getByLabelText, getByText, onPickA, onPickB } = setup(layout);
      expect(getByText('Sync')).toBeTruthy();
      fireEvent.press(getByLabelText('Pick Swing A'));
      fireEvent.press(getByLabelText('Pick Swing B'));
      expect(onPickA).toHaveBeenCalledTimes(1);
      expect(onPickB).toHaveBeenCalledTimes(1);
    },
  );
});
