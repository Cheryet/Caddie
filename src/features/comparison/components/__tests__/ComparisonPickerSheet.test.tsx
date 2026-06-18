/**
 * ComparisonPickerSheet — Component tests
 * useVideos + VideoCard are stubbed. Verifies the visible list renders, the
 * exclude filter hides the other slot's video, choosing routes the id, and
 * the empty state.
 */

import type { ReactElement } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ComparisonPickerSheet } from '../ComparisonPickerSheet';

interface VideosMockState {
  videos: { id: string }[] | null;
  isLoading: boolean;
  error: unknown;
}

jest.mock('@/features/library/hooks/useVideos', () => {
  const state: VideosMockState = { videos: [], isLoading: false, error: null };
  return {
    useVideos: () => ({ ...state, isRefreshing: false, refresh: jest.fn() }),
    __state: state,
  };
});

jest.mock('@/features/library/components/VideoCard', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    VideoCard: ({
      video,
      onPress,
    }: {
      video: { id: string };
      onPress: (v: { id: string }) => void;
    }) =>
      React.createElement(
        Pressable,
        { accessibilityLabel: `card-${video.id}`, onPress: () => onPress(video) },
        React.createElement(Text, null, video.id),
      ),
  };
});

const videosState = (
  jest.requireMock('@/features/library/hooks/useVideos') as {
    __state: VideosMockState;
  }
).__state;

function wrap(ui: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      {ui}
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  videosState.videos = [{ id: 'v1' }, { id: 'v2' }];
  videosState.isLoading = false;
  videosState.error = null;
});

describe('ComparisonPickerSheet', () => {
  it('lists the user’s swings when open', () => {
    const { getByText, getByLabelText } = wrap(
      <ComparisonPickerSheet visible onChoose={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('Pick a swing')).toBeTruthy();
    expect(getByLabelText('card-v1')).toBeTruthy();
    expect(getByLabelText('card-v2')).toBeTruthy();
  });

  it('excludes the other slot’s video', () => {
    const { queryByLabelText } = wrap(
      <ComparisonPickerSheet
        visible
        onChoose={jest.fn()}
        onDismiss={jest.fn()}
        excludeVideoId="v1"
      />,
    );
    expect(queryByLabelText('card-v1')).toBeNull();
    expect(queryByLabelText('card-v2')).not.toBeNull();
  });

  it('routes the chosen video id', () => {
    const onChoose = jest.fn();
    const { getByLabelText } = wrap(
      <ComparisonPickerSheet visible onChoose={onChoose} onDismiss={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('card-v2'));
    expect(onChoose).toHaveBeenCalledWith('v2');
  });

  it('shows an empty message when there are no other swings', () => {
    videosState.videos = [];
    const { getByText } = wrap(
      <ComparisonPickerSheet visible onChoose={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(getByText('No other swings to compare yet.')).toBeTruthy();
  });
});
