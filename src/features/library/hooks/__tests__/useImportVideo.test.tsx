/**
 * useImportVideo — Hook tests
 * Drives every branch through the renderHook + act pattern: picker
 * outcomes (success / cancel / too_long), sheet open/close, and the
 * upload happy and failure paths.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

// ───── Mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/picker', () => ({
  pickVideo: jest.fn(),
}));

jest.mock('@/utils/upload', () => ({
  uploadRecording: jest.fn(),
}));

jest.mock('@/utils/lastClub', () => ({
  loadLastClub: jest.fn(() => '7 Iron'),
  setLastClub: jest.fn(),
}));

jest.mock('@/components/ui', () => {
  const show = jest.fn();
  return { Toast: { show }, __toast: { show } };
});

jest.mock('@/store/useAppStore', () => ({
  useAppStore: <T,>(selector: (s: { user: { id: string } | null }) => T): T =>
    selector({ user: { id: 'user-1' } }),
}));

const { pickVideo } = require('@/utils/picker') as { pickVideo: jest.Mock };
const { uploadRecording } = require('@/utils/upload') as {
  uploadRecording: jest.Mock;
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

    const { result } = renderHook(() => useImportVideo());
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

    const { result } = renderHook(() => useImportVideo());
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

    const { result } = renderHook(() => useImportVideo());
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.sheet.visible).toBe(false);
    expect(toastShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' }),
    );
  });

  it('uploads on confirm and toasts success', async () => {
    pickVideo.mockResolvedValueOnce({
      data: { uri: 'file:///tmp/swing.mov', durationSec: 5, fileName: 'a.mov' },
      error: null,
    });
    uploadRecording.mockResolvedValueOnce({ data: { videoId: 'vid' }, error: null });
    const onUploadComplete = jest.fn();

    const { result } = renderHook(() => useImportVideo({ onUploadComplete }));
    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start();
    });
    await runDwell();
    await act(async () => {
      await startPromise;
    });
    await act(async () => {
      await result.current.sheet.onConfirm({
        angle: 'face-on',
        swingHand: 'right',
        club: '7 Iron',
      });
    });

    expect(uploadRecording).toHaveBeenCalledWith(
      expect.objectContaining({
        localUri: 'file:///tmp/swing.mov',
        userId: 'user-1',
        clubType: '7 Iron',
      }),
    );
    expect(toastShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    );
    expect(onUploadComplete).toHaveBeenCalled();
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

    const { result } = renderHook(() => useImportVideo());
    expect(result.current.isProcessing).toBe(false);

    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start();
    });
    // Right after start: overlay is still hidden (delay timer hasn't
    // fired). This is the window where PHPicker is animating in.
    expect(result.current.isProcessing).toBe(false);

    // Advance past the present-delay. Overlay flips to true so the
    // moment PHPicker dismisses, it'll be visible.
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

    const { result } = renderHook(() => useImportVideo());
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

  it('shows an error toast when upload fails', async () => {
    pickVideo.mockResolvedValueOnce({
      data: { uri: 'file:///tmp/swing.mov', durationSec: 5, fileName: 'a.mov' },
      error: null,
    });
    uploadRecording.mockResolvedValueOnce({
      data: null,
      error: { code: 'network', message: 'offline' },
    });

    const { result } = renderHook(() => useImportVideo());
    let startPromise!: Promise<void>;
    act(() => {
      startPromise = result.current.start();
    });
    await runDwell();
    await act(async () => {
      await startPromise;
    });
    await act(async () => {
      await result.current.sheet.onConfirm({
        angle: 'face-on',
        swingHand: 'right',
        club: '7 Iron',
      });
    });

    expect(toastShow).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' }),
    );
  });
});
