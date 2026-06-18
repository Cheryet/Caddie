/**
 * ComparePanel — Component tests
 * VideoPlayer + Slider are stubbed. Covers the empty slot (pick), the error
 * state (pick another), and the ready panel (label-tap to change, speed
 * switch, tap-to-play).
 */

import { fireEvent, render } from '@testing-library/react-native';

import { ComparePanel } from '../ComparePanel';
import type { ComparePanelState } from '../../types';

jest.mock('@/features/playback/components/VideoPlayer', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VideoPlayer: React.forwardRef((_props: object, _ref: unknown) =>
      React.createElement(View, { testID: 'video-stub' }),
    ),
  };
});

jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { onValueChange?: (v: number) => void }) =>
      React.createElement(View, {
        testID: 'slider-stub',
        onValueChange: props.onValueChange,
      }),
  };
});

jest.mock('@/features/pose/components/PoseOverlay', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { PoseOverlay: () => React.createElement(View, { testID: 'pose-stub' }) };
});

function makePanel(overrides: Partial<ComparePanelState> = {}): ComparePanelState {
  return {
    videoId: 'v1',
    status: 'ready',
    uri: 'https://signed/v.mp4',
    label: 'Driver · Today',
    isPlaying: false,
    currentMs: 0,
    durationMs: 5000,
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
    ...overrides,
  };
}

describe('ComparePanel', () => {
  it('renders an empty slot and picks on tap', () => {
    const onPick = jest.fn();
    const panel = makePanel({ status: 'empty', uri: null, videoId: null });
    const { getByText, getByLabelText } = render(
      <ComparePanel panel={panel} playerRef={null} onPick={onPick} placeholder="Swing A" />,
    );
    expect(getByText('Pick a swing')).toBeTruthy();
    expect(getByText('Swing A')).toBeTruthy();
    fireEvent.press(getByLabelText('Pick Swing A'));
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('renders the error state and picks another on tap', () => {
    const onPick = jest.fn();
    const panel = makePanel({ status: 'error', uri: null });
    const { getByText } = render(
      <ComparePanel panel={panel} playerRef={null} onPick={onPick} placeholder="Swing A" />,
    );
    fireEvent.press(getByText('Tap to pick another'));
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('renders the ready panel with its label and switches speed', () => {
    const panel = makePanel();
    const { getByText } = render(
      <ComparePanel panel={panel} playerRef={null} onPick={jest.fn()} placeholder="Swing A" />,
    );
    expect(getByText('Driver · Today')).toBeTruthy();
    fireEvent.press(getByText('1×'));
    expect(panel.setRate).toHaveBeenCalledWith(1);
  });

  it('toggles play when the surface is tapped', () => {
    const panel = makePanel();
    const { getByLabelText } = render(
      <ComparePanel panel={panel} playerRef={null} onPick={jest.fn()} placeholder="Swing A" />,
    );
    fireEvent.press(getByLabelText('Play'));
    expect(panel.toggle).toHaveBeenCalledTimes(1);
  });

  it('changes the video when the label is tapped', () => {
    const onPick = jest.fn();
    const panel = makePanel();
    const { getByText } = render(
      <ComparePanel panel={panel} playerRef={null} onPick={onPick} placeholder="Swing A" />,
    );
    fireEvent.press(getByText('Driver · Today'));
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('marks impact when the Impact button is tapped', () => {
    const panel = makePanel();
    const { getByLabelText } = render(
      <ComparePanel panel={panel} playerRef={null} onPick={jest.fn()} placeholder="Swing A" />,
    );
    fireEvent.press(getByLabelText('Mark impact frame'));
    expect(panel.markImpact).toHaveBeenCalledTimes(1);
  });

  it('shows the amber impact tick only when impact is marked', () => {
    const { queryByTestId } = render(
      <ComparePanel panel={makePanel()} playerRef={null} onPick={jest.fn()} placeholder="Swing A" />,
    );
    expect(queryByTestId('impact-tick')).toBeNull();

    const { getByTestId } = render(
      <ComparePanel
        panel={makePanel({ impactMs: 2000 })}
        playerRef={null}
        onPick={jest.fn()}
        placeholder="Swing A"
      />,
    );
    expect(getByTestId('impact-tick')).toBeTruthy();
  });

  it('renders the pose toggle only when the engine is available', () => {
    const off = render(
      <ComparePanel panel={makePanel()} playerRef={null} onPick={jest.fn()} placeholder="Swing A" />,
    );
    expect(off.queryByLabelText('Toggle pose overlay')).toBeNull();

    const panel = makePanel({ poseAvailable: true });
    const on = render(
      <ComparePanel panel={panel} playerRef={null} onPick={jest.fn()} placeholder="Swing A" />,
    );
    fireEvent.press(on.getByLabelText('Toggle pose overlay'));
    expect(panel.togglePose).toHaveBeenCalledTimes(1);
  });
});
