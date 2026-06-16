/**
 * useVideoSource — Hook tests
 * Mocks supabase client + storage to drive both branches:
 *   - { localUri } → synchronous passthrough
 *   - { videoId }  → row fetch + signed URL happy path + error mapping
 */

import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/core/supabase/client', () => {
  const single = jest.fn();
  const eq = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return {
    supabase: { from },
    __spies: { single, eq, select, from },
  };
});

jest.mock('@/core/supabase/storage', () => {
  const getSignedVideoUrl = jest.fn();
  return { getSignedVideoUrl, __spies: { getSignedVideoUrl } };
});

const { __spies: clientSpies } = require('@/core/supabase/client') as {
  __spies: { single: jest.Mock };
};
const { __spies: storageSpies } = require('@/core/supabase/storage') as {
  __spies: { getSignedVideoUrl: jest.Mock };
};
const { useVideoSource } = require('../useVideoSource');

const baseRow = {
  title: 'Range — 7 Iron',
  club_type: '7 Iron',
  camera_angle: 'face-on',
  swing_hand: 'right',
  storage_path: 'user-1/vid-1.mp4',
  created_at: '2026-06-15T11:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  clientSpies.single.mockResolvedValue({ data: baseRow, error: null });
  storageSpies.getSignedVideoUrl.mockResolvedValue({
    data: { url: 'https://signed.example/swing.mp4' },
    error: null,
  });
});

describe('useVideoSource', () => {
  it('passes localUri straight through with no loading state', () => {
    const { result } = renderHook(() =>
      useVideoSource({
        localUri: 'file:///tmp/swing.mov',
        angle: 'face-on',
        clubType: '7 Iron',
        swingHand: 'right',
      }),
    );
    expect(result.current.uri).toBe('file:///tmp/swing.mov');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.meta?.clubType).toBe('7 Iron');
    expect(clientSpies.single).not.toHaveBeenCalled();
  });

  it('fetches row + signed URL for videoId path', async () => {
    const { result } = renderHook(() =>
      useVideoSource({ videoId: 'vid-1' }),
    );
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.uri).toBe('https://signed.example/swing.mp4');
    expect(result.current.meta?.cameraAngle).toBe('face-on');
    expect(result.current.error).toBeNull();
  });

  it('surfaces not_found when the row is missing', async () => {
    clientSpies.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'No rows returned' },
    });
    const { result } = renderHook(() =>
      useVideoSource({ videoId: 'missing' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.code).toBe('not_found');
    expect(result.current.uri).toBeNull();
  });

  it('surfaces network code when fetch times out', async () => {
    clientSpies.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Network request timeout' },
    });
    const { result } = renderHook(() =>
      useVideoSource({ videoId: 'vid-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.code).toBe('network');
  });

  it('surfaces error when getSignedVideoUrl fails', async () => {
    storageSpies.getSignedVideoUrl.mockResolvedValueOnce({
      data: null,
      error: { code: 'not_found', message: 'gone' },
    });
    const { result } = renderHook(() =>
      useVideoSource({ videoId: 'vid-1' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error?.code).toBe('not_found');
  });
});
