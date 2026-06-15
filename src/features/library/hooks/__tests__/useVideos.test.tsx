/**
 * useVideos — Hook tests
 * Mocks supabase client (both the query chain and the storage helper),
 * drives the hook with React Testing Library's renderHook, and asserts
 * loading → data, refresh, error, and unauthenticated branches.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

// ───── Mocks ─────────────────────────────────────────────────────────────
// Each test reconfigures `orderResolved` to drive the query result.
jest.mock('@/core/supabase/client', () => {
  const orderResolved = jest.fn();
  const order = jest.fn().mockImplementation((...args) => orderResolved(...args));
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  const getPublicUrl = jest.fn((path: string) => ({
    data: { publicUrl: `https://public.example/${path}` },
  }));
  const storageFrom = jest.fn(() => ({ getPublicUrl }));
  return {
    supabase: {
      from,
      storage: { from: storageFrom },
    },
    __spies: { from, select, eq, order, orderResolved, getPublicUrl, storageFrom },
  };
});

const SIGNED_IN_USER = { id: 'user-1', email: 'a@b.com' };

const storeState: {
  user: { id: string; email: string } | null;
  isAuthLoading: boolean;
} = {
  user: SIGNED_IN_USER,
  isAuthLoading: false,
};

jest.mock('@/store/useAppStore', () => ({
  useAppStore: <T,>(selector: (s: typeof storeState) => T): T => selector(storeState),
}));

const { __spies } = require('@/core/supabase/client') as {
  __spies: { orderResolved: jest.Mock };
};
const { useVideos } = require('../useVideos');

const baseRow = {
  id: 'vid-1',
  title: 'Range — 7 Iron',
  club_type: '7 Iron',
  camera_angle: 'face-on',
  swing_hand: 'right',
  duration_ms: 4200,
  thumbnail_path: 'user-1/vid-1.jpg',
  has_analysis: true,
  created_at: '2026-06-15T11:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  storeState.user = SIGNED_IN_USER;
  storeState.isAuthLoading = false;
  __spies.orderResolved.mockResolvedValue({ data: [baseRow], error: null });
});

describe('useVideos', () => {
  it('loads videos and resolves thumbnail public URLs', async () => {
    const { result } = renderHook(() => useVideos());
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.videos).toHaveLength(1);
    expect(result.current.videos?.[0]?.thumbnailUrl).toBe(
      'https://public.example/user-1/vid-1.jpg',
    );
    expect(result.current.videos?.[0]?.cameraAngle).toBe('face-on');
    expect(result.current.videos?.[0]?.swingHand).toBe('right');
    expect(result.current.videos?.[0]?.hasAnalysis).toBe(true);
  });

  it('returns an empty array when the table has no rows', async () => {
    __spies.orderResolved.mockResolvedValueOnce({ data: [], error: null });
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.videos).toEqual([]);
  });

  it('surfaces a network error code on fetch failure', async () => {
    __spies.orderResolved.mockResolvedValueOnce({
      data: null,
      error: { message: 'Network request failed' },
    });
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.code).toBe('network');
  });

  it('refresh re-fetches and toggles isRefreshing', async () => {
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    __spies.orderResolved.mockResolvedValueOnce({
      data: [baseRow, { ...baseRow, id: 'vid-2', thumbnail_path: null }],
      error: null,
    });

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.videos).toHaveLength(2);
    expect(result.current.videos?.[1]?.thumbnailUrl).toBeNull();
    expect(result.current.isRefreshing).toBe(false);
  });

  it('returns unauthenticated when no user', async () => {
    storeState.user = null;
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.code).toBe('unauthenticated');
    expect(result.current.videos).toEqual([]);
  });

  it('drops rows that fail validation but keeps the rest', async () => {
    __spies.orderResolved.mockResolvedValueOnce({
      data: [
        baseRow,
        { id: 42, title: null }, // malformed — wrong types
      ],
      error: null,
    });
    const { result } = renderHook(() => useVideos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.videos).toHaveLength(1);
    expect(result.current.videos?.[0]?.id).toBe('vid-1');
  });
});
