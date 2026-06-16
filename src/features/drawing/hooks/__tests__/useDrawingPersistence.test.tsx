/**
 * useDrawingPersistence — Hook tests
 * Verifies the load on mount and the 1s debounced save. Supabase +
 * Toast are mocked at the module boundary; fake timers drive the
 * debounce.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { CanvasSize, DrawingState } from '@/features/drawing/types';

// ───── Mocks ─────────────────────────────────────────────────────────────

jest.mock('@/core/supabase/client', () => {
  const single = jest.fn();
  const eqFetch = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq: eqFetch }));
  const eqUpdate = jest.fn().mockResolvedValue({ error: null });
  const update = jest.fn(() => ({ eq: eqUpdate }));
  const from = jest.fn(() => ({ select, update }));
  return {
    supabase: { from },
    __spies: { single, eqFetch, eqUpdate, update, select, from },
  };
});

jest.mock('@/components/ui', () => {
  const show = jest.fn();
  return { Toast: { show }, __toast: { show } };
});

const { __spies } = require('@/core/supabase/client') as {
  __spies: {
    single: jest.Mock;
    eqFetch: jest.Mock;
    eqUpdate: jest.Mock;
    update: jest.Mock;
    from: jest.Mock;
  };
};
const { __toast } = require('@/components/ui') as {
  __toast: { show: jest.Mock };
};
const { useDrawingPersistence } = require('../useDrawingPersistence');

const SIZE: CanvasSize = { width: 400, height: 800 };

function setup(initialShapes: DrawingState = []) {
  const onLoaded = jest.fn();
  let shapesNow: DrawingState = initialShapes;
  const { rerender, ...rest } = renderHook(
    (props: { shapes: DrawingState }) => {
      shapesNow = props.shapes;
      return useDrawingPersistence({
        videoId: 'vid-1',
        canvasSize: SIZE,
        shapes: props.shapes,
        onLoaded,
      });
    },
    { initialProps: { shapes: initialShapes } },
  );
  return { onLoaded, rerender, getShapes: () => shapesNow, ...rest };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDrawingPersistence — load', () => {
  it('parses saved shapes and calls onLoaded', async () => {
    __spies.single.mockResolvedValueOnce({
      data: {
        drawings: {
          v: 1,
          shapes: [
            {
              id: 'L',
              kind: 'line',
              color: 'white',
              start: { x: 0.25, y: 0.25 },
              end: { x: 0.75, y: 0.75 },
            },
          ],
        },
      },
      error: null,
    });

    const { onLoaded } = setup();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() => expect(onLoaded).toHaveBeenCalled());
    const shapes = onLoaded.mock.calls[0]![0];
    expect(shapes).toHaveLength(1);
    expect(shapes[0]).toMatchObject({
      kind: 'line',
      start: { x: 100, y: 200 }, // 0.25 × 400, 0.25 × 800
      end: { x: 300, y: 600 },
    });
  });

  it('toasts an error when the persisted JSON fails Zod', async () => {
    __spies.single.mockResolvedValueOnce({
      data: { drawings: { v: 'not-a-version', shapes: [] } },
      error: null,
    });
    const { onLoaded } = setup();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(__toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'error' }),
    );
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('no-ops on null drawings (no saved annotations yet)', async () => {
    __spies.single.mockResolvedValueOnce({
      data: { drawings: null },
      error: null,
    });
    const { onLoaded } = setup();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onLoaded).not.toHaveBeenCalled();
    expect(__toast.show).not.toHaveBeenCalled();
  });
});

describe('useDrawingPersistence — save (debounced)', () => {
  it('debounces 1s after a shapes change before writing', async () => {
    __spies.single.mockResolvedValueOnce({
      data: { drawings: null },
      error: null,
    });
    const { rerender } = setup([]);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const newShapes: DrawingState = [
      {
        id: 'L',
        kind: 'line',
        color: 'white',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      },
    ];
    act(() => rerender({ shapes: newShapes }));
    // Before 1s elapses → no write.
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(__spies.update).not.toHaveBeenCalled();

    // After 1s → one write.
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(__spies.update).toHaveBeenCalledTimes(1);
  });

  it('coalesces rapid changes into a single write', async () => {
    __spies.single.mockResolvedValueOnce({
      data: { drawings: null },
      error: null,
    });
    const { rerender } = setup([]);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const makeLine = (id: string): DrawingState => [
      {
        id,
        kind: 'line',
        color: 'white',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      },
    ];

    act(() => rerender({ shapes: makeLine('a') }));
    act(() => jest.advanceTimersByTime(200));
    act(() => rerender({ shapes: makeLine('b') }));
    act(() => jest.advanceTimersByTime(200));
    act(() => rerender({ shapes: makeLine('c') }));
    act(() => jest.advanceTimersByTime(1100));

    expect(__spies.update).toHaveBeenCalledTimes(1);
  });

  it('does not save before the initial load completes', async () => {
    // Keep load pending — return a never-resolving promise so the
    // hook's loadedRef stays unset.
    __spies.single.mockReturnValueOnce(new Promise(() => {}));
    const { rerender } = setup([]);
    const newShapes: DrawingState = [
      {
        id: 'L',
        kind: 'line',
        color: 'white',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      },
    ];
    act(() => rerender({ shapes: newShapes }));
    act(() => jest.advanceTimersByTime(2000));
    expect(__spies.update).not.toHaveBeenCalled();
  });
});
