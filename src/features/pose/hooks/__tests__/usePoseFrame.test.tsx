/**
 * usePoseFrame — Hook tests
 * Mocks the pose core (detect + map) and the status hook so we can drive
 * the gating + debounce without a native engine. Fake timers exercise
 * the settle-based detection.
 */

import { act, renderHook } from '@testing-library/react-native';

import { usePoseFrame } from '../usePoseFrame';

jest.mock('@/core/pose', () => ({
  detectPoseFrame: jest.fn(),
  toPoseFrame: jest.fn(),
}));
jest.mock('@/features/pose/hooks/usePoseStatus', () => ({
  usePoseStatus: jest.fn(),
}));

const { detectPoseFrame, toPoseFrame } = require('@/core/pose') as {
  detectPoseFrame: jest.Mock;
  toPoseFrame: jest.Mock;
};
const { usePoseStatus } = require('@/features/pose/hooks/usePoseStatus') as {
  usePoseStatus: jest.Mock;
};

const MOCK_FRAME = { aspect: 16 / 9, joints: { root: {} } };
const DEBOUNCE_MS = 140;

interface Props {
  uri: string | null;
  currentMs: number;
  enabled: boolean;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  usePoseStatus.mockReturnValue({ status: 'ready', error: null });
  detectPoseFrame.mockResolvedValue({ width: 16, height: 9, landmarks: [] });
  toPoseFrame.mockReturnValue(MOCK_FRAME);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePoseFrame', () => {
  it('does not detect while disabled', async () => {
    const { result } = renderHook(() =>
      usePoseFrame({ uri: 'file:///s.mov', currentMs: 0, enabled: false }),
    );
    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(detectPoseFrame).not.toHaveBeenCalled();
    expect(result.current.frame).toBeNull();
  });

  it('does not detect until the engine is ready', async () => {
    usePoseStatus.mockReturnValue({ status: 'loading', error: null });
    renderHook(() =>
      usePoseFrame({ uri: 'file:///s.mov', currentMs: 0, enabled: true }),
    );
    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(detectPoseFrame).not.toHaveBeenCalled();
  });

  it('does not detect without a uri', async () => {
    renderHook(() =>
      usePoseFrame({ uri: null, currentMs: 0, enabled: true }),
    );
    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(detectPoseFrame).not.toHaveBeenCalled();
  });

  it('detects the current frame (debounced) when enabled + ready', async () => {
    const { result } = renderHook(() =>
      usePoseFrame({ uri: 'file:///s.mov', currentMs: 1200, enabled: true }),
    );
    // Nothing before the debounce window elapses.
    expect(detectPoseFrame).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });

    expect(detectPoseFrame).toHaveBeenCalledWith('file:///s.mov', 1200);
    expect(toPoseFrame).toHaveBeenCalledWith([], 16 / 9);
    expect(result.current.frame).toBe(MOCK_FRAME);
  });

  it('clears the frame when toggled off', async () => {
    const { result, rerender } = renderHook(
      (props: Props) => usePoseFrame(props),
      {
        initialProps: {
          uri: 'file:///s.mov' as string | null,
          currentMs: 0,
          enabled: true,
        },
      },
    );
    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(result.current.frame).toBe(MOCK_FRAME);

    await act(async () => {
      rerender({ uri: 'file:///s.mov', currentMs: 0, enabled: false });
    });
    expect(result.current.frame).toBeNull();
  });

  it('debounces rapid scrubbing into a single detect', async () => {
    const { rerender } = renderHook((props: Props) => usePoseFrame(props), {
      initialProps: {
        uri: 'file:///s.mov' as string | null,
        currentMs: 0,
        enabled: true,
      },
    });
    // Three quick position changes — each rerender flushes its effect
    // (clearing the prior pending timer) before the next, so only the
    // last position's timer survives to fire.
    await act(async () => {
      rerender({ uri: 'file:///s.mov', currentMs: 100, enabled: true });
    });
    await act(async () => {
      rerender({ uri: 'file:///s.mov', currentMs: 200, enabled: true });
    });
    await act(async () => {
      rerender({ uri: 'file:///s.mov', currentMs: 300, enabled: true });
    });
    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_MS);
    });
    expect(detectPoseFrame).toHaveBeenCalledTimes(1);
    expect(detectPoseFrame).toHaveBeenCalledWith('file:///s.mov', 300);
  });
});
