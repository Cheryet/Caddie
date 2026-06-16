/**
 * useDrawing — Feature hook
 * Owns the drawing-canvas state machine. Phase 2.2 adds shape
 * creation + edit + undo on top of the Phase 2.1 foundation:
 *
 *   committed shapes    → `shapes`
 *   in-flight shape     → `inProgress`
 *   currently dragging  → `editing` (line endpoint drag)
 *
 * `enabled` is derived from `tool`: only the tools we've actually
 * implemented (line + freehand) enable touch capture. Selecting one
 * of the 2.3-pending tools (select / circle / angle / plane) leaves
 * the canvas in pass-through mode so the player's tap-to-toggle-
 * chrome behaviour keeps working.
 *
 * Used by: PlaybackScreen.
 */

import { useCallback, useRef, useState } from 'react';

import {
  DEFAULT_COLOR,
  ENDPOINT_HIT_RADIUS,
  type DrawingState,
  type FreehandShape,
  type LineShape,
  type Point,
  type Shape,
  type ShapeId,
  type Tool,
} from '@/features/drawing/types';

const ACTIVE_TOOLS: ReadonlySet<Tool> = new Set(['line', 'freehand']);

/** Track which endpoint of a line the user is currently dragging. */
interface EndpointDrag {
  shapeId: ShapeId;
  endpoint: 'start' | 'end';
}

interface UseDrawingReturn {
  // ── State ──
  tool: Tool;
  shapes: DrawingState;
  /** The shape currently being drawn (null between strokes). */
  inProgress: Shape | null;
  /** True when the user is actively dragging on the canvas. */
  isStroking: boolean;
  /** Derived — true when the canvas should capture touches. */
  enabled: boolean;
  // ── Tool / shape commands ──
  setTool: (tool: Tool) => void;
  /** Remove the most recently committed shape. No-op if empty. */
  undo: () => void;
  /** Drop every committed shape. */
  clear: () => void;
  // ── Stroke handlers (driven by DrawingCanvas) ──
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: () => void;
}

let nextId = 0;
function makeId(): ShapeId {
  nextId += 1;
  // Monotonic + timestamp → unique within a process; not cryptographic.
  return `shape-${Date.now().toString(36)}-${nextId}`;
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the closest line endpoint within hit-radius of `point`, if any.
 * Returns the most recently committed match so overlapping endpoints
 * favour the newer shape (which the user most likely wants to edit).
 */
function hitTestEndpoint(
  shapes: DrawingState,
  point: Point,
): EndpointDrag | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const s = shapes[i];
    if (!s || s.kind !== 'line') continue;
    if (distance(s.start, point) <= ENDPOINT_HIT_RADIUS) {
      return { shapeId: s.id, endpoint: 'start' };
    }
    if (distance(s.end, point) <= ENDPOINT_HIT_RADIUS) {
      return { shapeId: s.id, endpoint: 'end' };
    }
  }
  return null;
}

export function useDrawing(): UseDrawingReturn {
  const [tool, setTool] = useState<Tool>('none');
  const [shapes, setShapes] = useState<DrawingState>([]);
  const [inProgress, setInProgress] = useState<Shape | null>(null);
  const [isStroking, setIsStroking] = useState(false);

  // `editing` lives in a ref because it's only meaningful between
  // start/move/end of a single drag — never something a child renders.
  const editingRef = useRef<EndpointDrag | null>(null);

  const onStrokeStart = useCallback(
    (point: Point) => {
      setIsStroking(true);

      // If the Line tool is active and the touch lands on an existing
      // endpoint, switch to edit-endpoint mode instead of creating a
      // new shape. We snapshot the latest shapes via the functional
      // setter to avoid stale closures.
      if (tool === 'line') {
        const hit = hitTestEndpoint(shapes, point);
        if (hit) {
          editingRef.current = hit;
          return;
        }
      }

      if (tool === 'line') {
        const shape: LineShape = {
          id: makeId(),
          kind: 'line',
          color: DEFAULT_COLOR,
          start: point,
          end: point,
        };
        setInProgress(shape);
      } else if (tool === 'freehand') {
        const shape: FreehandShape = {
          id: makeId(),
          kind: 'freehand',
          color: DEFAULT_COLOR,
          points: [point],
        };
        setInProgress(shape);
      }
    },
    [tool, shapes],
  );

  const onStrokeMove = useCallback(
    (point: Point) => {
      // Endpoint-drag branch wins over new-shape branch.
      const editing = editingRef.current;
      if (editing) {
        setShapes(prev =>
          prev.map(s => {
            if (s.id !== editing.shapeId || s.kind !== 'line') return s;
            return editing.endpoint === 'start'
              ? { ...s, start: point }
              : { ...s, end: point };
          }),
        );
        return;
      }

      setInProgress(prev => {
        if (!prev) return prev;
        if (prev.kind === 'line') {
          return { ...prev, end: point };
        }
        // Freehand — append; don't mutate.
        return { ...prev, points: [...prev.points, point] };
      });
    },
    [],
  );

  const onStrokeEnd = useCallback(() => {
    setIsStroking(false);

    // Endpoint drag finishes silently — shapes already mutated.
    if (editingRef.current) {
      editingRef.current = null;
      return;
    }

    // Commit the in-progress shape unless it was degenerate (e.g. a
    // line where start === end because the user tapped without
    // dragging). A bare tap is treated as a no-op so the user can
    // dismiss a misclick without leaving a zero-length artefact.
    setInProgress(prev => {
      if (!prev) return null;
      if (prev.kind === 'line' && distance(prev.start, prev.end) < 4) {
        return null;
      }
      if (prev.kind === 'freehand' && prev.points.length < 2) {
        return null;
      }
      setShapes(s => [...s, prev]);
      return null;
    });
  }, []);

  const undo = useCallback(() => {
    setShapes(prev => (prev.length === 0 ? prev : prev.slice(0, -1)));
  }, []);

  const clear = useCallback(() => {
    setShapes([]);
  }, []);

  return {
    tool,
    shapes,
    inProgress,
    isStroking,
    enabled: ACTIVE_TOOLS.has(tool),
    setTool,
    undo,
    clear,
    onStrokeStart,
    onStrokeMove,
    onStrokeEnd,
  };
}
