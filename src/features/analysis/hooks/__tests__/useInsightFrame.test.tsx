/**
 * useInsightFrame — Hook tests
 * Drives the derivation: meta → signed URL → fallback timestamp → extracted
 * still. Supabase, storage, and the native extractor are mocked. Asserts the
 * happy path (extracts at the position fraction, returns a data URI) and that
 * every failure mode degrades to `'error'` (the screen's frameless fallback)
 * without throwing.
 */

import { renderHook, waitFor } from '@testing-library/react-native';

import { useInsightFrame } from '../useInsightFrame';
import { getSignedVideoUrl } from '@/core/supabase/storage';
import { extractFrameJpegs } from '@/core/pose';
import { fallbackTimestamps } from '@/utils/frameExtractor';

interface VideoResult {
  data: unknown;
  error: unknown;
}
interface MockState {
  video: VideoResult;
}

jest.mock('@/core/supabase/client', () => {
  const state: MockState = { video: { data: null, error: null } };
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    single: () => Promise.resolve(state.video),
  };
  return { supabase: { from: () => b }, __state: state };
});

jest.mock('@/core/supabase/storage', () => ({ getSignedVideoUrl: jest.fn() }));
jest.mock('@/core/pose', () => ({ extractFrameJpegs: jest.fn() }));

const mockState = (
  jest.requireMock('@/core/supabase/client') as { __state: MockState }
).__state;
const mockSignedUrl = getSignedVideoUrl as jest.Mock;
const mockExtract = extractFrameJpegs as jest.Mock;

const DURATION_MS = 4000;

beforeEach(() => {
  mockState.video = {
    data: { storage_path: 'user-1/v.mp4', duration_ms: DURATION_MS },
    error: null,
  };
  mockSignedUrl.mockReset();
  mockSignedUrl.mockResolvedValue({
    data: { url: 'https://signed/v.mp4' },
    error: null,
  });
  mockExtract.mockReset();
  mockExtract.mockResolvedValue(['BASE64DATA']);
});

describe('useInsightFrame', () => {
  it('extracts the frame at the position fraction and returns a data URI', async () => {
    const frameIndex = 3;
    const { result } = renderHook(() => useInsightFrame('video-1', frameIndex));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.frameUri).toBe('data:image/jpeg;base64,BASE64DATA');

    const expectedTs = fallbackTimestamps(DURATION_MS)[frameIndex];
    expect(mockExtract).toHaveBeenCalledWith(
      'https://signed/v.mp4',
      [expectedTs],
      1200,
      85,
    );
  });

  it('errors (frameless) when the video meta is missing', async () => {
    mockState.video = { data: null, error: { message: 'no rows' } };
    const { result } = renderHook(() => useInsightFrame('video-1', 0));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.frameUri).toBeNull();
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('errors when the video has no duration (position not placeable)', async () => {
    mockState.video = {
      data: { storage_path: 'x', duration_ms: null },
      error: null,
    };
    const { result } = renderHook(() => useInsightFrame('video-1', 0));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(mockSignedUrl).not.toHaveBeenCalled();
  });

  it('errors when the signed URL cannot be minted', async () => {
    mockSignedUrl.mockResolvedValue({
      data: null,
      error: { code: 'unknown', message: 'no url' },
    });
    const { result } = renderHook(() => useInsightFrame('video-1', 0));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('errors when native extraction throws', async () => {
    mockExtract.mockRejectedValue(new Error('native fail'));
    const { result } = renderHook(() => useInsightFrame('video-1', 0));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.frameUri).toBeNull();
  });
});
