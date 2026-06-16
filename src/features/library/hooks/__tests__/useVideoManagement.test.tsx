/**
 * useVideoManagement — Hook tests
 * Drives the hook through each branch: action-sheet → edit save,
 * action-sheet → delete confirm, plus the error cases for each.
 */

import { act, renderHook } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';

import type { Video } from '@/features/library/hooks/useVideos';

// ───── Mocks ─────────────────────────────────────────────────────────────

jest.mock('@/core/supabase/client', () => {
  const update = jest.fn();
  const del = jest.fn();
  const eqUpdate = jest.fn(() => updateChain.eqResult);
  const eqDelete = jest.fn(() => deleteChain.eqResult);
  const updateChain = {
    eqResult: { error: null as { message: string } | null },
  };
  const deleteChain = {
    eqResult: { error: null as { message: string } | null },
  };
  update.mockImplementation(() => ({ eq: eqUpdate }));
  del.mockImplementation(() => ({ eq: eqDelete }));
  const from = jest.fn(() => ({
    update: () => ({ eq: eqUpdate }),
    delete: () => ({ eq: eqDelete }),
  }));
  return {
    supabase: { from },
    __chains: { updateChain, deleteChain, eqUpdate, eqDelete, from },
  };
});

jest.mock('@/core/supabase/storage', () => ({
  deleteVideo: jest.fn().mockResolvedValue({ data: true, error: null }),
  deleteThumbnail: jest.fn().mockResolvedValue({ data: true, error: null }),
}));

jest.mock('@/components/ui', () => {
  const show = jest.fn();
  return { Toast: { show }, __toast: { show } };
});

const { __chains } = require('@/core/supabase/client') as {
  __chains: {
    updateChain: { eqResult: { error: { message: string } | null } };
    deleteChain: { eqResult: { error: { message: string } | null } };
    eqUpdate: jest.Mock;
    eqDelete: jest.Mock;
  };
};
const storage = require('@/core/supabase/storage') as {
  deleteVideo: jest.Mock;
  deleteThumbnail: jest.Mock;
};
const { __toast } = require('@/components/ui') as {
  __toast: { show: jest.Mock };
};
const { useVideoManagement } = require('../useVideoManagement');

function makeVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'vid-1',
    title: 'Range — 7 Iron',
    clubType: '7 Iron',
    cameraAngle: 'face-on',
    swingHand: 'right',
    durationMs: 4200,
    storagePath: 'user-1/vid-1.mp4',
    thumbnailPath: 'user-1/vid-1.jpg',
    thumbnailUrl: 'https://public.example/thumb.jpg',
    hasAnalysis: false,
    createdAt: '2026-06-15T11:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  __chains.updateChain.eqResult = { error: null };
  __chains.deleteChain.eqResult = { error: null };
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useVideoManagement', () => {
  it('start opens the ActionSheetIOS with three options', () => {
    const spy = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation(() => {});
    const { result } = renderHook(() => useVideoManagement());
    act(() => result.current.start(makeVideo()));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        options: ['Edit details', 'Delete swing', 'Cancel'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      }),
      expect.any(Function),
    );
  });

  it('routes "Edit details" tap to the edit sheet', () => {
    const video = makeVideo();
    let capturedCallback: ((index: number) => void) | null = null;
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_opts, cb) => {
        capturedCallback = cb;
      });
    const { result } = renderHook(() => useVideoManagement());
    act(() => result.current.start(video));
    act(() => capturedCallback?.(0));
    expect(result.current.editSheet.video).toBe(video);
    expect(result.current.deleteSheet.video).toBeNull();
  });

  it('routes "Delete swing" tap to the delete sheet', () => {
    const video = makeVideo();
    let capturedCallback: ((index: number) => void) | null = null;
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_opts, cb) => {
        capturedCallback = cb;
      });
    const { result } = renderHook(() => useVideoManagement());
    act(() => result.current.start(video));
    act(() => capturedCallback?.(1));
    expect(result.current.deleteSheet.video).toBe(video);
    expect(result.current.editSheet.video).toBeNull();
  });

  it('onSave updates the row, toasts success, and clears the sheet', async () => {
    const video = makeVideo();
    let capturedCallback: ((index: number) => void) | null = null;
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_opts, cb) => {
        capturedCallback = cb;
      });

    const onMutationComplete = jest.fn();
    const { result } = renderHook(() =>
      useVideoManagement({ onMutationComplete }),
    );
    act(() => result.current.start(video));
    act(() => capturedCallback?.(0));

    await act(async () => {
      await result.current.editSheet.onSave({
        title: 'New title',
        clubType: '8 Iron',
        cameraAngle: 'dtl',
        swingHand: 'left',
        tags: ['range', 'warmup'],
      });
    });

    expect(__chains.eqUpdate).toHaveBeenCalledWith('id', 'vid-1');
    expect(__toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    );
    expect(result.current.editSheet.video).toBeNull();
    expect(onMutationComplete).toHaveBeenCalled();
  });

  it('onSave surfaces an error toast and keeps the sheet open', async () => {
    const video = makeVideo();
    let capturedCallback: ((index: number) => void) | null = null;
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_opts, cb) => {
        capturedCallback = cb;
      });
    __chains.updateChain.eqResult = { error: { message: 'rls denied' } };

    const { result } = renderHook(() => useVideoManagement());
    act(() => result.current.start(video));
    act(() => capturedCallback?.(0));

    await act(async () => {
      await result.current.editSheet.onSave({
        title: 'x',
        clubType: '7 Iron',
        cameraAngle: 'face-on',
        swingHand: 'right',
        tags: [],
      });
    });

    expect(__toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' }),
    );
    expect(result.current.editSheet.video).toBe(video);
  });

  it('onConfirm deletes the row, fires storage cleanup, and toasts', async () => {
    const video = makeVideo();
    let capturedCallback: ((index: number) => void) | null = null;
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_opts, cb) => {
        capturedCallback = cb;
      });

    const onMutationComplete = jest.fn();
    const { result } = renderHook(() =>
      useVideoManagement({ onMutationComplete }),
    );
    act(() => result.current.start(video));
    act(() => capturedCallback?.(1));

    await act(async () => {
      await result.current.deleteSheet.onConfirm();
    });

    expect(__chains.eqDelete).toHaveBeenCalledWith('id', 'vid-1');
    expect(storage.deleteVideo).toHaveBeenCalledWith('user-1/vid-1.mp4');
    expect(storage.deleteThumbnail).toHaveBeenCalledWith('user-1/vid-1.jpg');
    expect(__toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' }),
    );
    expect(result.current.deleteSheet.video).toBeNull();
    expect(onMutationComplete).toHaveBeenCalled();
  });

  it('onConfirm leaves the sheet open and toasts error when the row delete fails', async () => {
    const video = makeVideo();
    let capturedCallback: ((index: number) => void) | null = null;
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_opts, cb) => {
        capturedCallback = cb;
      });
    __chains.deleteChain.eqResult = { error: { message: 'rls denied' } };

    const { result } = renderHook(() => useVideoManagement());
    act(() => result.current.start(video));
    act(() => capturedCallback?.(1));

    await act(async () => {
      await result.current.deleteSheet.onConfirm();
    });

    expect(storage.deleteVideo).not.toHaveBeenCalled();
    expect(__toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' }),
    );
    expect(result.current.deleteSheet.video).toBe(video);
  });

  it('skips deleteThumbnail when thumbnailPath is null', async () => {
    const video = makeVideo({ thumbnailPath: null });
    let capturedCallback: ((index: number) => void) | null = null;
    jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_opts, cb) => {
        capturedCallback = cb;
      });

    const { result } = renderHook(() => useVideoManagement());
    act(() => result.current.start(video));
    act(() => capturedCallback?.(1));

    await act(async () => {
      await result.current.deleteSheet.onConfirm();
    });

    expect(storage.deleteVideo).toHaveBeenCalled();
    expect(storage.deleteThumbnail).not.toHaveBeenCalled();
  });
});
