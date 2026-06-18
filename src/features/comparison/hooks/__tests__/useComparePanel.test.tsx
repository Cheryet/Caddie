/**
 * useComparePanel — Hook tests
 * supabase + storage mocked. Covers: empty slot, resolve-to-ready (signed
 * URL + label), the not-found / sign-failure error paths, and the playback
 * controls (toggle, seek + clamp, rate, onEnd reset).
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useComparePanel } from '../useComparePanel';
import { getSignedVideoUrl } from '@/core/supabase/storage';

interface RowResult {
  data: unknown;
  error: unknown;
}

jest.mock('@/core/supabase/client', () => {
  const state: { row: RowResult } = { row: { data: null, error: null } };
  const builder = () => {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      single: () => Promise.resolve(state.row),
    };
    return b;
  };
  return { supabase: { from: () => builder() }, __state: state };
});

jest.mock('@/core/supabase/storage', () => ({ getSignedVideoUrl: jest.fn() }));

const mockState = (
  jest.requireMock('@/core/supabase/client') as { __state: { row: RowResult } }
).__state;
const mockSign = getSignedVideoUrl as jest.Mock;

const ROW = {
  club_type: 'Driver',
  created_at: '2026-06-17T12:00:00.000Z',
  storage_path: 'user-1/v.mp4',
};

beforeEach(() => {
  mockState.row = { data: ROW, error: null };
  mockSign.mockReset();
  mockSign.mockResolvedValue({ data: { url: 'https://signed/v.mp4' }, error: null });
});

describe('useComparePanel', () => {
  it('is empty with no video selected', () => {
    const { result } = renderHook(() =>
      useComparePanel({ videoId: null, onSeek: jest.fn() }),
    );
    expect(result.current.status).toBe('empty');
    expect(result.current.uri).toBeNull();
  });

  it('resolves a selected video to a signed URL + label', async () => {
    const { result } = renderHook(() =>
      useComparePanel({ videoId: 'v1', onSeek: jest.fn() }),
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.uri).toBe('https://signed/v.mp4');
    expect(result.current.label).toContain('Driver');
  });

  it('errors when the row is missing', async () => {
    mockState.row = { data: null, error: { message: 'No rows' } };
    const { result } = renderHook(() =>
      useComparePanel({ videoId: 'v1', onSeek: jest.fn() }),
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('errors when signing fails', async () => {
    mockSign.mockResolvedValueOnce({ data: null, error: { code: 'unknown' } });
    const { result } = renderHook(() =>
      useComparePanel({ videoId: 'v1', onSeek: jest.fn() }),
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('toggles play/pause', async () => {
    const { result } = renderHook(() =>
      useComparePanel({ videoId: 'v1', onSeek: jest.fn() }),
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.isPlaying).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(true);
  });

  it('seeks the player and clamps to duration', async () => {
    const onSeek = jest.fn();
    const { result } = renderHook(() => useComparePanel({ videoId: 'v1', onSeek }));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.setDuration(5000));
    act(() => result.current.seekMs(9000));

    expect(result.current.currentMs).toBe(5000);
    expect(onSeek).toHaveBeenLastCalledWith(5); // seconds
  });

  it('resets on end', async () => {
    const onSeek = jest.fn();
    const { result } = renderHook(() => useComparePanel({ videoId: 'v1', onSeek }));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => result.current.toggle());
    act(() => result.current.onEnd());

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentMs).toBe(0);
    expect(onSeek).toHaveBeenLastCalledWith(0);
  });

  it('defaults to 0.5x and switches rate', async () => {
    const { result } = renderHook(() =>
      useComparePanel({ videoId: 'v1', onSeek: jest.fn() }),
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.rate).toBe(0.5);
    act(() => result.current.setRate(1));
    expect(result.current.rate).toBe(1);
  });
});
