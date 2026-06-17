/**
 * usePoseTrack — Hook tests
 * Mocks the pose core (precompute + track helpers) and the status hook
 * so we can drive the gating, the analyze→ready transition, the session
 * cache, and the error path without a native engine.
 */

import { act, renderHook } from '@testing-library/react-native';

import { usePoseTrack } from '../usePoseTrack';

jest.mock('@/core/pose', () => ({
  precomputePoses: jest.fn(),
  buildPoseTrack: jest.fn(),
  poseAt: jest.fn(),
}));
jest.mock('@/features/pose/hooks/usePoseStatus', () => ({
  usePoseStatus: jest.fn(),
}));

const { precomputePoses, buildPoseTrack, poseAt } = require('@/core/pose') as {
  precomputePoses: jest.Mock;
  buildPoseTrack: jest.Mock;
  poseAt: jest.Mock;
};
const { usePoseStatus } = require('@/features/pose/hooks/usePoseStatus') as {
  usePoseStatus: jest.Mock;
};

const RAW = [{ timeMs: 0, width: 16, height: 9, landmarks: [] }];
const TRACK = [{ timeMs: 0, frame: { aspect: 16 / 9, joints: {} } }];
const POSE = { aspect: 16 / 9, joints: { root: {} } };

interface Props {
  uri: string | null;
  enabled: boolean;
}

const props = (over: Partial<Props> = {}): Props => ({
  uri: 'file:///s.mov',
  enabled: true,
  ...over,
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  usePoseStatus.mockReturnValue({ status: 'ready', error: null });
  precomputePoses.mockResolvedValue(RAW);
  buildPoseTrack.mockReturnValue(TRACK);
  poseAt.mockReturnValue(POSE);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePoseTrack', () => {
  it('stays idle and does not pre-compute while disabled', () => {
    const { result } = renderHook(() => usePoseTrack(props({ enabled: false })));
    expect(result.current.status).toBe('idle');
    expect(precomputePoses).not.toHaveBeenCalled();
  });

  it('stays idle until the engine is ready', () => {
    usePoseStatus.mockReturnValue({ status: 'loading', error: null });
    const { result } = renderHook(() => usePoseTrack(props()));
    expect(result.current.status).toBe('idle');
    expect(precomputePoses).not.toHaveBeenCalled();
  });

  it('analyzes then becomes ready, and looks up frames', async () => {
    const { result } = renderHook(() => usePoseTrack(props()));
    expect(result.current.status).toBe('analyzing');
    expect(precomputePoses).toHaveBeenCalledWith('file:///s.mov', 30);

    await act(async () => {});

    expect(result.current.status).toBe('ready');
    expect(buildPoseTrack).toHaveBeenCalledWith(RAW);
    expect(result.current.frameAt(123)).toBe(POSE);
    expect(poseAt).toHaveBeenCalledWith(TRACK, 123);
  });

  it('reuses the cached track when re-enabled (no second pre-compute)', async () => {
    const { result, rerender } = renderHook((p: Props) => usePoseTrack(p), {
      initialProps: props(),
    });
    await act(async () => {});
    expect(result.current.status).toBe('ready');
    expect(precomputePoses).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender(props({ enabled: false }));
    });
    expect(result.current.status).toBe('idle');

    await act(async () => {
      rerender(props({ enabled: true }));
    });
    expect(result.current.status).toBe('ready');
    expect(precomputePoses).toHaveBeenCalledTimes(1); // cache hit
  });

  it('reports error when pre-compute fails', async () => {
    precomputePoses.mockRejectedValueOnce(new Error('download failed'));
    const { result } = renderHook(() => usePoseTrack(props()));
    await act(async () => {});
    expect(result.current.status).toBe('error');
    expect(result.current.frameAt(0)).toBeNull();
  });
});
