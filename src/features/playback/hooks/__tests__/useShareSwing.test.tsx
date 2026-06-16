/**
 * useShareSwing — Hook tests
 * Verifies the capture → share → toast chain plus the
 * isSharing guard against re-entrancy.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

jest.mock('@/features/playback/utils/captureFrame', () => ({
  captureFrame: jest.fn(),
}));

jest.mock('@/components/ui', () => {
  const show = jest.fn();
  return { Toast: { show }, __toast: { show } };
});

const { captureFrame } = require('@/features/playback/utils/captureFrame') as {
  captureFrame: jest.Mock;
};
const { __toast } = require('@/components/ui') as {
  __toast: { show: jest.Mock };
};
const { useShareSwing } = require('../useShareSwing');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useShareSwing', () => {
  it('captures and opens the share sheet on success', async () => {
    captureFrame.mockResolvedValueOnce({
      data: { uri: 'file:///tmp/swing.jpg' },
      error: null,
    });
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValueOnce({ action: 'sharedAction' } as never);

    const ref = { current: null };
    const { result } = renderHook(() => useShareSwing(ref));
    await act(async () => {
      await result.current.share();
    });

    expect(captureFrame).toHaveBeenCalledWith(ref);
    expect(shareSpy).toHaveBeenCalledWith({ url: 'file:///tmp/swing.jpg' });
    expect(__toast.show).not.toHaveBeenCalled();
    shareSpy.mockRestore();
  });

  it('toasts when capture fails', async () => {
    captureFrame.mockResolvedValueOnce({
      data: null,
      error: { code: 'unknown', message: 'nope' },
    });

    const { result } = renderHook(() => useShareSwing({ current: null }));
    await act(async () => {
      await result.current.share();
    });

    expect(__toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' }),
    );
  });

  it('toggles isSharing across the lifecycle', async () => {
    let resolveCapture: (
      v: { data: { uri: string } | null; error: null },
    ) => void = () => {};
    captureFrame.mockReturnValueOnce(
      new Promise(res => {
        resolveCapture = res;
      }),
    );
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValueOnce({ action: 'sharedAction' } as never);

    const { result } = renderHook(() => useShareSwing({ current: null }));
    let p!: Promise<void>;
    act(() => {
      p = result.current.share();
    });
    await waitFor(() => expect(result.current.isSharing).toBe(true));

    await act(async () => {
      resolveCapture({
        data: { uri: 'file:///tmp/x.jpg' },
        error: null,
      });
      await p;
    });
    expect(result.current.isSharing).toBe(false);
    shareSpy.mockRestore();
  });

  it('is re-entrant safe — concurrent share() calls collapse to one', async () => {
    captureFrame.mockResolvedValue({
      data: { uri: 'file:///tmp/x.jpg' },
      error: null,
    });
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as never);

    const { result } = renderHook(() => useShareSwing({ current: null }));
    await act(async () => {
      await Promise.all([result.current.share(), result.current.share()]);
    });
    expect(captureFrame).toHaveBeenCalledTimes(1);
    shareSpy.mockRestore();
  });
});
