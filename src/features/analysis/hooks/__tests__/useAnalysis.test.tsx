/**
 * useAnalysis — Hook tests
 * Drives the four branches at the data boundary (supabase, storage, frame
 * extractor mocked): cache hit (no API call), cache miss → analyze, a
 * function error → typed error, and a missing video. The chainable supabase
 * client is faked with a per-table result map.
 */

import { renderHook, waitFor } from '@testing-library/react-native';

import { useAnalysis } from '../useAnalysis';
import { getSignedVideoUrl } from '@/core/supabase/storage';
import { extractAnalysisFrames } from '@/utils/frameExtractor';
import {
  MOCK_ANALYSIS,
  mockAnalysisEnvelope,
  mockAnalysisRow,
} from '../../__fixtures__/analysis';

// ───── Mocks ─────────────────────────────────────────────────────────────

interface TableResult {
  data: unknown;
  error: unknown;
}
interface MockState {
  results: Record<'analyses' | 'videos' | 'profiles', TableResult>;
  invoke: jest.Mock;
}

jest.mock('@/core/supabase/client', () => {
  const state: MockState = {
    results: {
      analyses: { data: null, error: null },
      videos: { data: null, error: null },
      profiles: { data: null, error: null },
    },
    invoke: jest.fn(),
  };
  const makeBuilder = (table: keyof MockState['results']) => {
    const b: Record<string, unknown> = {
      select: () => b,
      eq: () => b,
      order: () => b,
      limit: () => b,
      single: () => Promise.resolve(state.results[table]),
      maybeSingle: () => Promise.resolve(state.results[table]),
    };
    return b;
  };
  return {
    supabase: {
      from: (table: keyof MockState['results']) => makeBuilder(table),
      functions: { invoke: (...args: unknown[]) => state.invoke(...args) },
    },
    __state: state,
  };
});

jest.mock('@/core/supabase/storage', () => ({
  getSignedVideoUrl: jest.fn(),
}));

jest.mock('@/utils/frameExtractor', () => ({
  extractAnalysisFrames: jest.fn(),
}));

jest.mock('@/store/useAppStore', () => ({
  useAppStore: <T,>(selector: (s: { user: { id: string } | null }) => T): T =>
    selector({ user: { id: 'user-1' } }),
}));

// Pull the mutable state + typed mock fns back out of the mocked modules.
const mockState = (
  jest.requireMock('@/core/supabase/client') as { __state: MockState }
).__state;
const mockSignedUrl = getSignedVideoUrl as jest.Mock;
const mockExtractFrames = extractAnalysisFrames as jest.Mock;

const videoRow = {
  club_type: 'Driver',
  camera_angle: 'face-on',
  swing_hand: 'right',
  duration_ms: 4000,
  storage_path: 'user-1/v.mp4',
  created_at: '2026-06-17T12:00:00.000Z',
};

beforeEach(() => {
  mockState.results.analyses = { data: null, error: null };
  mockState.results.videos = { data: videoRow, error: null };
  mockState.results.profiles = { data: { skill_level: 'advanced' }, error: null };
  mockState.invoke.mockReset();
  mockState.invoke.mockResolvedValue({ data: mockAnalysisEnvelope, error: null });
  mockSignedUrl.mockReset();
  mockSignedUrl.mockResolvedValue({ data: { url: 'https://signed/v.mp4' }, error: null });
  mockExtractFrames.mockReset();
  mockExtractFrames.mockResolvedValue({
    frames: Array.from({ length: 8 }, (_, i) => `frame-${i}`),
    strategy: 'fallback',
    timestampsMs: [],
  });
});

describe('useAnalysis', () => {
  it('renders a cached analysis without calling the Edge Function', async () => {
    mockState.results.analyses = { data: mockAnalysisRow, error: null };
    const { result } = renderHook(() => useAnalysis('video-1'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.analysis).toEqual(MOCK_ANALYSIS);
    expect(result.current.subtitle).toContain('Driver');
    expect(mockState.invoke).not.toHaveBeenCalled();
  });

  it('analyses on a cache miss and renders the result', async () => {
    const { result } = renderHook(() => useAnalysis('video-1'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.analysis).toEqual(MOCK_ANALYSIS);
    expect(mockState.invoke).toHaveBeenCalledTimes(1);

    const [fnName, options] = mockState.invoke.mock.calls[0] as [
      string,
      { body: { videoId: string; frames: string[]; userSkillLevel: string } },
    ];
    expect(fnName).toBe('analyze-swing');
    expect(options.body.videoId).toBe('video-1');
    expect(options.body.frames).toHaveLength(8);
    expect(options.body.userSkillLevel).toBe('advanced');
  });

  it('maps a function HTTP error to a typed analysis error', async () => {
    mockState.invoke.mockResolvedValue({
      data: null,
      error: { context: { json: async () => ({ error: { code: 'rate_limited' } }) } },
    });
    const { result } = renderHook(() => useAnalysis('video-1'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.code).toBe('rate_limited');
    expect(result.current.error?.retryable).toBe(false);
  });

  it('treats an error without a response body as a network failure', async () => {
    mockState.invoke.mockResolvedValue({ data: null, error: new Error('offline') });
    const { result } = renderHook(() => useAnalysis('video-1'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.code).toBe('network');
  });

  it('errors with not_found when the video is missing', async () => {
    mockState.results.videos = { data: null, error: { message: 'No rows returned' } };
    const { result } = renderHook(() => useAnalysis('video-1'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error?.code).toBe('not_found');
    expect(mockState.invoke).not.toHaveBeenCalled();
  });
});
