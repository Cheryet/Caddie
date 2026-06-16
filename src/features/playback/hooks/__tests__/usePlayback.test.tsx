/**
 * usePlayback — Hook tests
 * Drives the state machine through play/pause, scrub, rate, step, and
 * the auto-hide chrome timer. Fake timers throughout so the 3s
 * auto-hide doesn't block.
 */

import { act, renderHook } from '@testing-library/react-native';

import { FRAME_STEP_MS } from '@/constants/playback';
import { usePlayback } from '../usePlayback';

const onSeek = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('usePlayback', () => {
  it('starts playing with chrome visible', () => {
    const { result } = renderHook(() => usePlayback({ onSeek }));
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.chromeVisible).toBe(true);
    expect(result.current.rate).toBe(1);
  });

  it('auto-hides chrome 3s after mount', () => {
    const { result } = renderHook(() => usePlayback({ onSeek }));
    act(() => {
      jest.advanceTimersByTime(3100);
    });
    expect(result.current.chromeVisible).toBe(false);
  });

  it('toggle flips play state and shows/resets chrome', () => {
    const { result } = renderHook(() => usePlayback({ onSeek }));

    // Pause: chrome stays visible, no auto-hide.
    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(false);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.chromeVisible).toBe(true);

    // Resume: schedules auto-hide again.
    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(true);
    act(() => {
      jest.advanceTimersByTime(3100);
    });
    expect(result.current.chromeVisible).toBe(false);
  });

  it('seekMs clamps to [0, duration] and calls onSeek in seconds', () => {
    const { result } = renderHook(() => usePlayback({ onSeek }));
    act(() => result.current.setDuration(5000));

    act(() => result.current.seekMs(3000));
    expect(result.current.currentMs).toBe(3000);
    expect(onSeek).toHaveBeenLastCalledWith(3);

    act(() => result.current.seekMs(-100));
    expect(result.current.currentMs).toBe(0);

    act(() => result.current.seekMs(99999));
    expect(result.current.currentMs).toBe(5000);
  });

  it('stepFrame moves by FRAME_STEP_MS in both directions', () => {
    const { result } = renderHook(() => usePlayback({ onSeek }));
    act(() => result.current.setDuration(5000));
    act(() => result.current.setProgress(1000));

    act(() => result.current.stepFrame('next'));
    expect(result.current.currentMs).toBeCloseTo(1000 + FRAME_STEP_MS);

    act(() => result.current.stepFrame('prev'));
    expect(result.current.currentMs).toBeCloseTo(1000);
  });

  it('setRate updates rate and schedules auto-hide', () => {
    const { result } = renderHook(() => usePlayback({ onSeek }));
    act(() => result.current.setRate(0.5));
    expect(result.current.rate).toBe(0.5);
  });

  it('onEnd resets to 0 and pauses', () => {
    const { result } = renderHook(() => usePlayback({ onSeek }));
    act(() => result.current.setDuration(5000));
    act(() => result.current.setProgress(4900));

    act(() => result.current.onEnd());
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentMs).toBe(0);
    expect(onSeek).toHaveBeenLastCalledWith(0);
  });

  it('toggleChrome flips visibility', () => {
    const { result } = renderHook(() => usePlayback({ onSeek }));
    act(() => result.current.toggleChrome());
    expect(result.current.chromeVisible).toBe(false);

    act(() => result.current.toggleChrome());
    expect(result.current.chromeVisible).toBe(true);
  });

  it('chromeLocked suppresses auto-hide and forces visibility (covers Angle-tool case)', () => {
    const { result, rerender } = renderHook(
      ({ locked }: { locked: boolean }) =>
        usePlayback({ onSeek, chromeLocked: locked }),
      { initialProps: { locked: false } },
    );

    // Lock chrome — even after the auto-hide window passes, it stays visible.
    rerender({ locked: true });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.chromeVisible).toBe(true);

    // Unlock — the next 3s tick should hide as usual.
    rerender({ locked: false });
    act(() => {
      jest.advanceTimersByTime(3100);
    });
    expect(result.current.chromeVisible).toBe(false);
  });
});
