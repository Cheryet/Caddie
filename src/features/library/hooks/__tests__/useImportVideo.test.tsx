/**
 * useImportVideo — Hook tests
 * Drives every branch through renderHook + act: picker outcomes
 * (success / cancel / too_long), the overlay present-delay, and the
 * confirm hand-off to `onReview` (the upload now happens on the
 * PlaybackScreen, so confirm just routes there — no upload here).
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

// ───── Mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/picker', () => ({
  pickVideo: jest.fn(),
}));

jest.mock('@/utils/lastClub', () => ({
  loadLastClub: jest.fn(() => '7 Iron'),
  setLastClub: jest.fn(),
}));

jest.mock('@/components/ui', () => {
  const show = jest.fn();
  return { Toast: { show }, __toast: { show } };
});

const { pickVideo } = require('@/utils/picker') as { pickVideo: jest.Mock };
const { setLastClub } = require('@/utils/lastClub') as {
  setLastClub: jest.Mock;
};
const { __toast } = require('@/components/ui') as {
  __toast: { show: jest.Mock };
};
const toastShow = __toast.show;
const { useImportVideo } = require('../useImportVideo');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

/** Drive a kicked-off start() across the post-picker dwell timer. */
async function runDwell(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    jest.runAllTimers();
  });
}

describe('useImportVideo', () => {
  it('opens the sheet after a successful pick', async () => {
    pickVideo.mockResolvedValueOnce({
      data: { uri: 'file:///tmp/swing.mov', durationSec: 5, fileName: 'a.mov' },
      error: null,
    });

    const { result } = renderHook(() =>
      useImportVideo({ onReview: jest.fn() }),
    );
    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start();
    });
    await runDwell();
    await act(async () => {
      await startPromise;
    });

    expect(result.current.sheet.visible).toBe(true);
    expect(result.current.sheet.defaultClub).toBe('7 Iron');
    expect(toastShow).not.toHaveBeenCalled();
  });

  it('stays silent when the user cancels the picker', async () => {
    pickVideo.mockResolvedValueOnce({
      data: null,
      error: { code: 'cancelled', message: 'Picker dismissed.' },
    });

    const { result } = renderHook(() =>
      useImportVideo({ onReview: jest.fn() }),
    );
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.sheet.visible).toBe(false);
    expect(toastShow).not.toHaveBeenCalled();
  });

  it('shows an error toast for too_long', async () => {
    pickVideo.mockResolvedValueOnce({
      data: null,
      error: { code: 'too_long', message: 'Pick a swing under 60 seconds.' },
    });

    const { result } = renderHook(() =>
      useImportVideo({ onReview: jest.fn() }),
    );
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.sheet.visible).toBe(false);
    expect(toastShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' }),
    );
  });

  it('hands the clip to onReview on confirm (no upload) and closes the sheet', async () => {
    pickVideo.mockResolvedValueOnce({
      data: { uri: 'file:///tmp/swing.mov', durationSec: 5, fileName: 'a.mov' },
      error: null,
    });
    const onReview = jest.fn();

    const { result } = renderHook(() => useImportVideo({ onReview }));
    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start();
    });
    await runDwell();
    await act(async () => {
      await startPromise;
    });
    act(() => {
      result.current.sheet.onConfirm({
        angle: 'face-on',
        swingHand: 'right',
        club: '7 Iron',
      });
    });

    expect(onReview).toHaveBeenCalledWith('file:///tmp/swing.mov', {
      angle: 'face-on',
      swingHand: 'right',
      club: '7 Iron',
    });
    expect(setLastClub).toHaveBeenCalledWith('7 Iron');
    await waitFor(() => expect(result.current.sheet.visible).toBe(false));
  });

  it('holds the overlay back until the present-delay elapses', async () => {
    // pickVideo stays pending so we can observe state at each stage.
    let resolvePick: (value: {
      data: { uri: string; durationSec: number; fileName: string | null };
      error: null;
    }) => void = () => {};
    pickVideo.mockReturnValueOnce(
      new Promise(res => {
        resolvePick = res;
      }),
    );

    const { result } = renderHook(() =>
      useImportVideo({ onReview: jest.fn() }),
    );
    expect(result.current.isProcessing).toBe(false);

    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start();
    });
    // Right after start: overlay is still hidden (delay timer hasn't fired).
    expect(result.current.isProcessing).toBe(false);

    // Advance past the present-delay. Overlay flips to true.
    act(() => {
      jest.advanceTimersByTime(2100);
    });
    expect(result.current.isProcessing).toBe(true);
    expect(result.current.sheet.visible).toBe(false);

    // Picker resolves → sheet opens, overlay clears.
    await act(async () => {
      resolvePick({
        data: { uri: 'file:///tmp/swing.mov', durationSec: 4, fileName: null },
        error: null,
      });
      await startPromise;
    });
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.sheet.visible).toBe(true);
  });

  it('never shows the overlay if the user picks before the delay elapses', async () => {
    pickVideo.mockResolvedValueOnce({
      data: { uri: 'file:///tmp/swing.mov', durationSec: 4, fileName: null },
      error: null,
    });

    const { result } = renderHook(() =>
      useImportVideo({ onReview: jest.fn() }),
    );
    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start();
    });
    // Let pickVideo resolve immediately; do NOT advance timers.
    await act(async () => {
      await startPromise;
    });
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.sheet.visible).toBe(true);
  });
});
