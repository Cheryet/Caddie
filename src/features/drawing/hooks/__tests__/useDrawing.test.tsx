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

  it('every drawing tool enables the canvas; "none" disables it', () => {
    const { result } = renderHook(() => useDrawing());

    for (const t of [
      'line',
      'freehand',
      'circle',
      'plane',
      'angle',
      'select',
    ] as const) {
      act(() => result.current.setTool(t));
      expect(result.current.enabled).toBe(true);
    }

    act(() => result.current.setTool('none'));
    expect(result.current.enabled).toBe(false);
  });

  it('Circle tool: drag commits a CircleShape; radius = distance', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('circle'));
    act(() => result.current.onStrokeStart({ x: 50, y: 50 }));
    act(() => result.current.onStrokeMove({ x: 53, y: 54 })); // r = 5
    act(() => result.current.onStrokeEnd());
    expect(result.current.shapes).toHaveLength(1);
    const shape = result.current.shapes[0];
    expect(shape).toMatchObject({
      kind: 'circle',
      center: { x: 50, y: 50 },
      radius: 5,
    });
  });

  it('Plane tool: drag commits a PlaneShape', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('plane'));
    act(() => result.current.onStrokeStart({ x: 0, y: 50 }));
    act(() => result.current.onStrokeMove({ x: 100, y: 50 }));
    act(() => result.current.onStrokeEnd());
    expect(result.current.shapes).toHaveLength(1);
    expect(result.current.shapes[0]?.kind).toBe('plane');
  });

  it('Angle tool: 3 sequential taps commit an AngleShape', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('angle'));

    let consumed = false;
    act(() => {
      consumed = result.current.onCanvasTap({ x: 50, y: 50 });
    });
    expect(consumed).toBe(true);
    expect(result.current.pendingAngle?.vertex).toEqual({ x: 50, y: 50 });

    act(() => {
      consumed = result.current.onCanvasTap({ x: 100, y: 50 });
    });
    expect(consumed).toBe(true);
    expect(result.current.pendingAngle?.end1).toEqual({ x: 100, y: 50 });

    act(() => {
      consumed = result.current.onCanvasTap({ x: 50, y: 100 });
    });
    expect(consumed).toBe(true);
    expect(result.current.pendingAngle).toBeNull();
    expect(result.current.shapes).toHaveLength(1);
    expect(result.current.shapes[0]?.kind).toBe('angle');
  });

  it('Select tool: tap on a shape selects it, tap on empty space clears', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    act(() => result.current.onStrokeStart({ x: 0, y: 0 }));
    act(() => result.current.onStrokeMove({ x: 100, y: 0 }));
    act(() => result.current.onStrokeEnd());
    const id = result.current.shapes[0]?.id;

    act(() => result.current.setTool('select'));
    let consumed = false;
    act(() => {
      consumed = result.current.onCanvasTap({ x: 50, y: 1 });
    });
    expect(consumed).toBe(true); // hit a shape → consumes tap
    expect(result.current.selectedShapeId).toBe(id);

    act(() => {
      consumed = result.current.onCanvasTap({ x: 500, y: 500 });
    });
    // Empty-space tap deselects but does NOT consume — chrome toggle
    // can fall through in the parent.
    expect(consumed).toBe(false);
    expect(result.current.selectedShapeId).toBeNull();
  });

  it('Select tool: drag moves the selected shape', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    act(() => result.current.onStrokeStart({ x: 0, y: 0 }));
    act(() => result.current.onStrokeMove({ x: 100, y: 0 }));
    act(() => result.current.onStrokeEnd());

    act(() => result.current.setTool('select'));
    act(() => {
      result.current.onCanvasTap({ x: 50, y: 1 });
    });
    act(() => result.current.onStrokeStart({ x: 50, y: 1 }));
    act(() => result.current.onStrokeMove({ x: 70, y: 21 }));
    act(() => result.current.onStrokeEnd());

    const shape = result.current.shapes[0];
    if (shape?.kind !== 'line') throw new Error('expected line');
    expect(shape.start).toMatchObject({ x: 20, y: 20 });
    expect(shape.end).toMatchObject({ x: 120, y: 20 });
  });

  it('deleteSelected removes the selected shape', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    act(() => result.current.onStrokeStart({ x: 0, y: 0 }));
    act(() => result.current.onStrokeMove({ x: 100, y: 0 }));
    act(() => result.current.onStrokeEnd());
    act(() => result.current.setTool('select'));
    act(() => {
      result.current.onCanvasTap({ x: 50, y: 1 });
    });
    expect(result.current.selectedShapeId).not.toBeNull();
    act(() => result.current.deleteSelected());
    expect(result.current.shapes).toHaveLength(0);
    expect(result.current.selectedShapeId).toBeNull();
  });

  it('setColor recolors the selected shape AND updates default', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    act(() => result.current.onStrokeStart({ x: 0, y: 0 }));
    act(() => result.current.onStrokeMove({ x: 100, y: 0 }));
    act(() => result.current.onStrokeEnd());

    act(() => result.current.setTool('select'));
    act(() => {
      result.current.onCanvasTap({ x: 50, y: 1 });
    });
    act(() => result.current.setColor('red'));
    expect(result.current.color).toBe('red');
    expect(result.current.shapes[0]?.color).toBe('red');
  });

  it('hydrate replaces shapes and clears transient state', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    act(() => result.current.onStrokeStart({ x: 0, y: 0 }));
    // Don't end the stroke → leave inProgress set.
    act(() => result.current.onStrokeMove({ x: 100, y: 100 }));
    expect(result.current.inProgress).not.toBeNull();

    act(() => {
      result.current.hydrate([
        {
          id: 'loaded-1',
          kind: 'line',
          color: 'red',
          start: { x: 5, y: 5 },
          end: { x: 50, y: 50 },
        },
      ]);
    });

    expect(result.current.shapes).toHaveLength(1);
    expect(result.current.shapes[0]?.id).toBe('loaded-1');
    expect(result.current.inProgress).toBeNull();
    expect(result.current.selectedShapeId).toBeNull();
    expect(result.current.pendingAngle).toBeNull();
  });

  it('switching tools cancels an in-flight angle', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('angle'));
    act(() => {
      result.current.onCanvasTap({ x: 10, y: 10 });
    });
    expect(result.current.pendingAngle).not.toBeNull();
    act(() => result.current.setTool('line'));
    expect(result.current.pendingAngle).toBeNull();
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
