/**
 * LibraryScreen — Screen tests
 * Mocks `useVideos` at the module boundary so we can drive each branch
 * (loading, empty, populated, error) without spinning up supabase or
 * MMKV. Asserts the screen renders the expected affordances and that
 * tapping a card / the empty CTA navigates correctly.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { Video } from '@/features/library/hooks/useVideos';

// ───── Mocks ─────────────────────────────────────────────────────────────
// jest.mock factories can't reference out-of-scope variables, so the
// mutable state lives inside the factory and the tests pull it out via
// `__state` on the mocked module.

jest.mock('@/features/library/hooks/useVideos', () => {
  const state = {
    videos: null as Video[] | null,
    isLoading: true,
    isRefreshing: false,
    error: null as { code: string; message: string } | null,
    refresh: jest.fn().mockResolvedValue(undefined),
  };
  return { useVideos: () => state, __state: state };
});

jest.mock('@/store/useAppStore', () => ({
  useAppStore: <T,>(selector: (s: { user: { id: string } | null }) => T): T =>
    selector({ user: { id: 'user-1' } }),
}));

jest.mock('@/core/supabase/client', () => {
  const insert = jest.fn().mockResolvedValue({ data: null, error: null });
  return { supabase: { from: () => ({ insert }) }, __spies: { insert } };
});

const { __state: hookState } = require('@/features/library/hooks/useVideos') as {
  __state: {
    videos: Video[] | null;
    isLoading: boolean;
    isRefreshing: boolean;
    error: { code: string; message: string } | null;
    refresh: jest.Mock;
  };
};
const { LibraryScreen } = require('../LibraryScreen');

// ───── Helpers ───────────────────────────────────────────────────────────

function renderScreen(ui: ReactElement) {
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

interface MockNav {
  navigate: jest.Mock;
  setOptions: jest.Mock;
  addListener: jest.Mock;
}

function makeNav(): MockNav {
  return {
    navigate: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => () => {}),
  };
}

function makeVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'vid-1',
    title: 'Range — 7 Iron',
    clubType: '7 Iron',
    cameraAngle: 'face-on',
    swingHand: 'right',
    durationMs: 4200,
    thumbnailUrl: 'https://public.example/thumb.jpg',
    hasAnalysis: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    ...overrides,
  };
}

function resetHookState() {
  hookState.videos = null;
  hookState.isLoading = true;
  hookState.isRefreshing = false;
  hookState.error = null;
  hookState.refresh = jest.fn().mockResolvedValue(undefined);
}

beforeEach(() => {
  resetHookState();
  jest.clearAllMocks();
});

// ───── Tests ─────────────────────────────────────────────────────────────

describe('LibraryScreen', () => {
  it('shows the page title in every state', () => {
    const nav = makeNav();
    const { getByText } = renderScreen(
      <LibraryScreen navigation={nav} route={{ key: 'k', name: 'Library' }} />,
    );
    expect(getByText('Your swings')).toBeTruthy();
  });

  it('renders the empty state with record CTA when videos is empty', () => {
    hookState.videos = [];
    hookState.isLoading = false;

    const nav = makeNav();
    const { getByText } = renderScreen(
      <LibraryScreen navigation={nav} route={{ key: 'k', name: 'Library' }} />,
    );

    expect(getByText('No swings on the books yet')).toBeTruthy();
    fireEvent.press(getByText('Record your first swing'));
    expect(nav.navigate).toHaveBeenCalledWith('Camera');
  });

  it('renders cards and navigates to Playback on tap', () => {
    hookState.videos = [makeVideo({ id: 'vid-a' }), makeVideo({ id: 'vid-b' })];
    hookState.isLoading = false;

    const nav = makeNav();
    const { getAllByRole } = renderScreen(
      <LibraryScreen navigation={nav} route={{ key: 'k', name: 'Library' }} />,
    );
    // First card maps to vid-a.
    const cards = getAllByRole('button').filter(node =>
      String(node.props.accessibilityLabel ?? '').includes('7 Iron'),
    );
    expect(cards.length).toBeGreaterThanOrEqual(2);
    fireEvent.press(cards[0]!);
    expect(nav.navigate).toHaveBeenCalledWith('Playback', { videoId: 'vid-a' });
  });

  it('opens the ActionSheetIOS when the + button is tapped', () => {
    hookState.videos = [];
    hookState.isLoading = false;

    const spy = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation(() => {});

    const nav = makeNav();
    const { getByLabelText } = renderScreen(
      <LibraryScreen navigation={nav} route={{ key: 'k', name: 'Library' }} />,
    );

    fireEvent.press(getByLabelText('Add swing'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('shows the DEV seed affordance in test/dev builds', () => {
    hookState.videos = [];
    hookState.isLoading = false;

    const nav = makeNav();
    const { getByLabelText } = renderScreen(
      <LibraryScreen navigation={nav} route={{ key: 'k', name: 'Library' }} />,
    );
    expect(getByLabelText('Seed test video')).toBeTruthy();
  });
});
