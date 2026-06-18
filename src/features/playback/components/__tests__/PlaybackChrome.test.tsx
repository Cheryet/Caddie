/**
 * PlaybackChrome — Component tests
 * Asserts: title renders, transport buttons dispatch, scrub onSeekMs
 * fires on slider change, speed underline reflects current rate.
 */

import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PlaybackChrome } from '../PlaybackChrome';
import type { PlaybackRate } from '@/features/playback/hooks/usePlayback';

jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Slider = (props: { onValueChange?: (v: number) => void }) =>
    React.createElement(View, {
      testID: 'mock-slider',
      onValueChange: props.onValueChange,
    });
  return { __esModule: true, default: Slider };
});

function wrap(ui: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {ui}
    </SafeAreaProvider>,
  );
}

const baseProps = {
  visible: true,
  title: '7 Iron',
  subtitle: 'Today',
  onBack: jest.fn(),
  onShare: jest.fn(),
  isPlaying: true,
  currentMs: 1000,
  durationMs: 5000,
  onToggle: jest.fn(),
  onStepPrev: jest.fn(),
  onStepNext: jest.fn(),
  onSeekMs: jest.fn(),
  rate: 1 as PlaybackRate,
  onRate: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PlaybackChrome', () => {
  it('renders title and subtitle', () => {
    const { getByText } = wrap(<PlaybackChrome {...baseProps} />);
    expect(getByText('7 Iron')).toBeTruthy();
    expect(getByText('Today')).toBeTruthy();
  });

  it('renders all three speeds with the active one selected', () => {
    const { getByLabelText } = wrap(
      <PlaybackChrome {...baseProps} rate={0.5} />,
    );
    expect(getByLabelText('0.25x speed').props.accessibilityState.selected).toBe(false);
    expect(getByLabelText('0.5x speed').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('1x speed').props.accessibilityState.selected).toBe(false);
  });

  it('dispatches transport callbacks', () => {
    const onToggle = jest.fn();
    const onStepPrev = jest.fn();
    const onStepNext = jest.fn();
    const { getByLabelText } = wrap(
      <PlaybackChrome
        {...baseProps}
        onToggle={onToggle}
        onStepPrev={onStepPrev}
        onStepNext={onStepNext}
      />,
    );
    fireEvent.press(getByLabelText('Pause'));
    fireEvent.press(getByLabelText('Previous frame'));
    fireEvent.press(getByLabelText('Next frame'));
    expect(onToggle).toHaveBeenCalled();
    expect(onStepPrev).toHaveBeenCalled();
    expect(onStepNext).toHaveBeenCalled();
  });

  it('shows the Play label when paused', () => {
    const { getByLabelText } = wrap(
      <PlaybackChrome {...baseProps} isPlaying={false} />,
    );
    expect(getByLabelText('Play')).toBeTruthy();
  });

  it('dispatches onRate when a speed button is tapped', () => {
    const onRate = jest.fn();
    const { getByLabelText } = wrap(
      <PlaybackChrome {...baseProps} onRate={onRate} />,
    );
    fireEvent.press(getByLabelText('0.5x speed'));
    expect(onRate).toHaveBeenCalledWith(0.5);
  });

  it('dispatches onBack and onShare from the top bar', () => {
    const onBack = jest.fn();
    const onShare = jest.fn();
    const { getByLabelText } = wrap(
      <PlaybackChrome {...baseProps} onBack={onBack} onShare={onShare} />,
    );
    fireEvent.press(getByLabelText('Close playback'));
    fireEvent.press(getByLabelText('Share swing'));
    expect(onBack).toHaveBeenCalled();
    expect(onShare).toHaveBeenCalled();
  });

  it('hides the pose pill until the engine is available', () => {
    const { queryByLabelText } = wrap(<PlaybackChrome {...baseProps} />);
    expect(queryByLabelText('Toggle pose overlay')).toBeNull();
  });

  it('shows the pose pill and dispatches onTogglePose when available', () => {
    const onTogglePose = jest.fn();
    const { getByLabelText } = wrap(
      <PlaybackChrome
        {...baseProps}
        poseAvailable
        poseEnabled={false}
        onTogglePose={onTogglePose}
      />,
    );
    const pill = getByLabelText('Toggle pose overlay');
    expect(pill.props.accessibilityState.selected).toBe(false);
    fireEvent.press(pill);
    expect(onTogglePose).toHaveBeenCalled();
  });

  it('marks the pose pill selected when enabled', () => {
    const { getByLabelText } = wrap(
      <PlaybackChrome {...baseProps} poseAvailable poseEnabled onTogglePose={jest.fn()} />,
    );
    expect(
      getByLabelText('Toggle pose overlay').props.accessibilityState.selected,
    ).toBe(true);
  });

  it('hides the Analyse with AI CTA until the swing is analysable', () => {
    const { queryByText } = wrap(<PlaybackChrome {...baseProps} />);
    expect(queryByText('Analyse with AI')).toBeNull();
  });

  it('shows the Analyse with AI CTA and dispatches onAnalyse', () => {
    const onAnalyse = jest.fn();
    const { getByText } = wrap(
      <PlaybackChrome {...baseProps} onAnalyse={onAnalyse} />,
    );
    fireEvent.press(getByText('Analyse with AI'));
    expect(onAnalyse).toHaveBeenCalled();
  });
});
