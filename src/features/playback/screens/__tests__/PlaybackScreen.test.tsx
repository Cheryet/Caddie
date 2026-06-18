/**
 * PlaybackScreen — Screen tests
 * Mocks the source + playback hooks + upload at module boundary so we
 * can drive every branch (loading / error / ready) without booting the
 * native video player. Verifies the screen wires title/back correctly
 * and that the upload fires in the background for fresh recordings.
 */

import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// ───── Mocks ─────────────────────────────────────────────────────────────

jest.mock('@/features/playback/hooks/useVideoSource', () => {
  const state = {
    uri: 'file:///tmp/swing.mov' as string | null,
    meta: {
      title: '7 Iron swing',
      clubType: '7 Iron',
      cameraAngle: 'face-on',
      swingHand: 'right',
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    } as object | null,
    isLoading: false,
    error: null as { code: string; message: string } | null,
    refresh: jest.fn(),
  };
  return { useVideoSource: () => state, __state: state };
});

jest.mock('@/features/playback/hooks/usePlayback', () => {
  const handlers = {
    play: jest.fn(),
    pause: jest.fn(),
    toggle: jest.fn(),
    setRate: jest.fn(),
    seekMs: jest.fn(),
    stepFrame: jest.fn(),
    toggleChrome: jest.fn(),
    setProgress: jest.fn(),
    setDuration: jest.fn(),
    onEnd: jest.fn(),
  };
  const state = {
    isPlaying: true,
    currentMs: 0,
    durationMs: 5000,
    rate: 1,
    chromeVisible: true,
    ...handlers,
  };
  return {
    usePlayback: () => state,
    PLAYBACK_RATES: [0.25, 0.5, 1],
    __state: state,
  };
});

jest.mock('@/utils/upload', () => ({
  uploadRecording: jest.fn().mockResolvedValue({
    data: { videoId: 'vid-1' },
    error: null,
  }),
}));

jest.mock('@/store/useAppStore', () => ({
  useAppStore: <T,>(selector: (s: { user: { id: string } | null }) => T): T =>
    selector({ user: { id: 'user-1' } }),
}));

jest.mock('@/components/ui', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Toast: { show: jest.fn() },
    // Button is rendered by PlaybackChrome's "Analyse with AI" CTA — stub it
    // as a pressable carrying its label so the screen renders + the CTA is
    // tappable.
    Button: ({ label, onPress }: { label: string; onPress: () => void }) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityRole: 'button' },
        React.createElement(Text, null, label),
      ),
  };
});

jest.mock('@/features/playback/components/VideoPlayer', () => {
  const React = require('react');
  const { View } = require('react-native');
  const VideoPlayer = React.forwardRef((_props: object, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({ seek: jest.fn() }));
    return React.createElement(View, { testID: 'video-player-stub' });
  });
  return { VideoPlayer };
});

// DrawingCanvas pulls react-native-gesture-handler which jest can't
// load natively. Stub it as a plain View tagged with the enabled flag.
jest.mock('@/features/drawing/components/DrawingCanvas', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    DrawingCanvas: (props: { enabled: boolean }) =>
      React.createElement(View, {
        testID: 'drawing-canvas-stub',
        'data-enabled': props.enabled,
      }),
  };
});

// Persistence + share hooks reach for supabase + view-shot which
// would otherwise pull in their native deps. Stub at the boundary so
// the screen test stays focused on screen wiring.
jest.mock('@/features/drawing/hooks/useDrawingPersistence', () => ({
  useDrawingPersistence: jest.fn(),
}));
jest.mock('@/features/playback/hooks/useShareSwing', () => ({
  useShareSwing: () => ({
    share: jest.fn().mockResolvedValue(undefined),
    isSharing: false,
  }),
}));

const { __state: sourceState } = require('@/features/playback/hooks/useVideoSource');
const { uploadRecording } = require('@/utils/upload') as {
  uploadRecording: jest.Mock;
};
const { PlaybackScreen } = require('../PlaybackScreen');

// ───── Helpers ───────────────────────────────────────────────────────────

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

function makeNav() {
  return {
    goBack: jest.fn(),
    navigate: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => () => {}),
  };
}

function resetSource() {
  sourceState.uri = 'file:///tmp/swing.mov';
  sourceState.meta = {
    title: '7 Iron swing',
    clubType: '7 Iron',
    cameraAngle: 'face-on',
    swingHand: 'right',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  };
  sourceState.isLoading = false;
  sourceState.error = null;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetSource();
});

// ───── Tests ─────────────────────────────────────────────────────────────

describe('PlaybackScreen', () => {
  it('renders the player + chrome when source has a uri', () => {
    const nav = makeNav();
    const { getByTestId, getByText } = wrap(
      <PlaybackScreen
        navigation={nav}
        route={{ key: 'k', name: 'Playback', params: { videoId: 'vid-1' } }}
      />,
    );
    expect(getByTestId('video-player-stub')).toBeTruthy();
    expect(getByText('7 Iron')).toBeTruthy();
  });

  it('navigates to Analysis when the Analyse with AI CTA is tapped', () => {
    const nav = makeNav();
    const { getByText } = wrap(
      <PlaybackScreen
        navigation={nav}
        route={{ key: 'k', name: 'Playback', params: { videoId: 'vid-1' } }}
      />,
    );
    fireEvent.press(getByText('Analyse with AI'));
    expect(nav.navigate).toHaveBeenCalledWith('Analysis', { videoId: 'vid-1' });
  });

  it('renders the loading view when source is not ready', () => {
    sourceState.uri = null;
    const nav = makeNav();
    const { getByText } = wrap(
      <PlaybackScreen
        navigation={nav}
        route={{ key: 'k', name: 'Playback', params: { videoId: 'vid-1' } }}
      />,
    );
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('renders an error view when source errors', () => {
    sourceState.uri = null;
    sourceState.error = { code: 'not_found', message: 'gone' };
    const nav = makeNav();
    const { getByText } = wrap(
      <PlaybackScreen
        navigation={nav}
        route={{ key: 'k', name: 'Playback', params: { videoId: 'vid-1' } }}
      />,
    );
    expect(getByText('Could not load swing')).toBeTruthy();
    fireEvent.press(getByText('Close'));
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('kicks off upload when route has localUri', async () => {
    const nav = makeNav();
    wrap(
      <PlaybackScreen
        navigation={nav}
        route={{
          key: 'k',
          name: 'Playback',
          params: {
            localUri: 'file:///tmp/swing.mov',
            angle: 'face-on',
            clubType: '7 Iron',
            swingHand: 'right',
          },
        }}
      />,
    );
    // Effect schedules the upload synchronously.
    expect(uploadRecording).toHaveBeenCalledWith(
      expect.objectContaining({
        localUri: 'file:///tmp/swing.mov',
        clubType: '7 Iron',
        userId: 'user-1',
      }),
    );
  });

  it('mounts the DrawingCanvas in disabled state (Phase 2.1 foundation)', () => {
    const nav = makeNav();
    const { getByTestId } = wrap(
      <PlaybackScreen
        navigation={nav}
        route={{ key: 'k', name: 'Playback', params: { videoId: 'vid-1' } }}
      />,
    );
    const canvas = getByTestId('drawing-canvas-stub');
    expect(canvas).toBeTruthy();
    expect(canvas.props['data-enabled']).toBe(false);
  });

  it('does NOT call upload when route has videoId only', () => {
    const nav = makeNav();
    wrap(
      <PlaybackScreen
        navigation={nav}
        route={{ key: 'k', name: 'Playback', params: { videoId: 'vid-1' } }}
      />,
    );
    expect(uploadRecording).not.toHaveBeenCalled();
  });
});
