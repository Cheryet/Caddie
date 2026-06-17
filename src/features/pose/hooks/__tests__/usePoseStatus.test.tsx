/**
 * usePoseStatus — Hook tests
 * Verifies the hook returns the singleton's current value and
 * re-renders when the singleton emits a transition.
 */

import { act, renderHook } from '@testing-library/react-native';

import { __resetPoseClientForTests, initPose } from '@/core/pose/client';
import { usePoseStatus } from '../usePoseStatus';

beforeEach(() => {
  __resetPoseClientForTests();
});

describe('usePoseStatus', () => {
  it('returns the current singleton status on mount', () => {
    const { result } = renderHook(() => usePoseStatus());
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('re-renders when the singleton transitions', async () => {
    const { result } = renderHook(() => usePoseStatus());
    await act(async () => {
      await initPose(() => ({
        initialize: () => Promise.resolve(),
        detectOnImage: () => Promise.resolve([]),
        detectOnVideoFrame: () =>
          Promise.resolve({ width: 0, height: 0, landmarks: [] }),
      }));
    });
    expect(result.current.status).toBe('ready');
  });

  it('surfaces the last init error on failure', async () => {
    const { result } = renderHook(() => usePoseStatus());
    await act(async () => {
      await initPose(() => {
        throw new Error('CaddiePose native module not found');
      });
    });
    expect(result.current.status).toBe('failed');
    expect(result.current.error?.code).toBe('package_unavailable');
  });
});
