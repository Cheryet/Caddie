/**
 * useDrawing — Hook tests
 * Covers Phase 2.1 contract (tool toggle, enabled, stroke lifecycle)
 * plus Phase 2.2 additions: shape commit for line + freehand, undo,
 * line-endpoint drag, and the degenerate-tap no-op.
 */

import { act, renderHook } from '@testing-library/react-native';

import { useDrawing } from '../useDrawing';

describe('useDrawing', () => {
  it('starts with no tool selected and the canvas disabled', () => {
    const { result } = renderHook(() => useDrawing());
    expect(result.current.tool).toBe('none');
    expect(result.current.enabled).toBe(false);
    expect(result.current.shapes).toEqual([]);
    expect(result.current.inProgress).toBeNull();
  });

  it('only the implemented tools (line, freehand) enable the canvas', () => {
    const { result } = renderHook(() => useDrawing());

    act(() => result.current.setTool('line'));
    expect(result.current.enabled).toBe(true);

    act(() => result.current.setTool('freehand'));
    expect(result.current.enabled).toBe(true);

    // 2.3-pending tools: tool flips but canvas stays disabled.
    act(() => result.current.setTool('circle'));
    expect(result.current.enabled).toBe(false);

    act(() => result.current.setTool('select'));
    expect(result.current.enabled).toBe(false);
  });

  it('Line tool: tap-drag commits a LineShape on stroke end', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    act(() => result.current.onStrokeStart({ x: 10, y: 20 }));
    act(() => result.current.onStrokeMove({ x: 100, y: 80 }));
    expect(result.current.inProgress?.kind).toBe('line');
    act(() => result.current.onStrokeEnd());
    expect(result.current.inProgress).toBeNull();
    expect(result.current.shapes).toHaveLength(1);
    const shape = result.current.shapes[0];
    expect(shape).toMatchObject({
      kind: 'line',
      start: { x: 10, y: 20 },
      end: { x: 100, y: 80 },
      color: 'white',
    });
  });

  it('Line tool: degenerate tap (start ≈ end) does NOT commit', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    act(() => result.current.onStrokeStart({ x: 50, y: 50 }));
    act(() => result.current.onStrokeMove({ x: 51, y: 51 }));
    act(() => result.current.onStrokeEnd());
    expect(result.current.shapes).toHaveLength(0);
  });

  it('Freehand tool: accumulates points and commits a FreehandShape', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('freehand'));
    act(() => result.current.onStrokeStart({ x: 0, y: 0 }));
    act(() => result.current.onStrokeMove({ x: 10, y: 10 }));
    act(() => result.current.onStrokeMove({ x: 20, y: 20 }));
    act(() => result.current.onStrokeEnd());
    expect(result.current.shapes).toHaveLength(1);
    const shape = result.current.shapes[0];
    expect(shape?.kind).toBe('freehand');
    if (shape?.kind === 'freehand') {
      expect(shape.points).toHaveLength(3);
    }
  });

  it('Freehand: a single-point stroke is dropped', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('freehand'));
    act(() => result.current.onStrokeStart({ x: 50, y: 50 }));
    act(() => result.current.onStrokeEnd());
    expect(result.current.shapes).toHaveLength(0);
  });

  it('Line endpoint drag: touching near an existing endpoint moves it', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    // Commit a line from (10,10) to (100,100).
    act(() => result.current.onStrokeStart({ x: 10, y: 10 }));
    act(() => result.current.onStrokeMove({ x: 100, y: 100 }));
    act(() => result.current.onStrokeEnd());
    expect(result.current.shapes).toHaveLength(1);

    // Touch within hit radius of `start` (10,10).
    act(() => result.current.onStrokeStart({ x: 12, y: 12 }));
    // Drag start to a new location.
    act(() => result.current.onStrokeMove({ x: 200, y: 200 }));
    act(() => result.current.onStrokeEnd());

    expect(result.current.shapes).toHaveLength(1);
    const shape = result.current.shapes[0];
    expect(shape).toMatchObject({
      kind: 'line',
      start: { x: 200, y: 200 },
      end: { x: 100, y: 100 },
    });
  });

  it('undo: removes the last shape, no-op when empty', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    act(() => result.current.onStrokeStart({ x: 0, y: 0 }));
    act(() => result.current.onStrokeMove({ x: 100, y: 100 }));
    act(() => result.current.onStrokeEnd());
    expect(result.current.shapes).toHaveLength(1);

    act(() => result.current.undo());
    expect(result.current.shapes).toHaveLength(0);

    // Second undo is a no-op.
    act(() => result.current.undo());
    expect(result.current.shapes).toHaveLength(0);
  });

  it('clear: drops every committed shape', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    // Two non-overlapping lines (second start avoids the first line's
    // endpoint-hit radius so it commits a new shape instead of editing).
    act(() => result.current.onStrokeStart({ x: 0, y: 0 }));
    act(() => result.current.onStrokeMove({ x: 100, y: 100 }));
    act(() => result.current.onStrokeEnd());
    act(() => result.current.onStrokeStart({ x: 200, y: 0 }));
    act(() => result.current.onStrokeMove({ x: 300, y: 100 }));
    act(() => result.current.onStrokeEnd());
    expect(result.current.shapes).toHaveLength(2);
    act(() => result.current.clear());
    expect(result.current.shapes).toHaveLength(0);
  });
});
