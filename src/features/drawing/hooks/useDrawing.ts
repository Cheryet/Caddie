/**
 * useDrawing — Feature hook
 * Owns the drawing-canvas state machine across all six tools shipped
 * through Phase 2.3.
 *
 *   committed shapes    → `shapes`
 *   in-flight shape     → `inProgress`
 *   in-flight angle     → `pendingAngle` (0/1/2 placed points)
 *   selected shape      → `selectedShapeId`
 *   current color       → `color` (applied to new shapes and to a
 *                                   currently-selected shape)
 *   canvas dimensions   → `canvasSize` (driven by DrawingCanvas
 *                                   onLayout; needed for plane lines)
 *
 * Tap handling:
 *   `onCanvasTap(point)` is called by the canvas first. It returns
 *   true when a tool consumes the tap (angle placement, select hit).
 *   When it returns false the canvas falls through to the parent's
 *   `onTap` (chrome toggle).
 *
 * Used by: PlaybackScreen.
 */

import { useCallback, useRef, useState } from 'react';

import {
  hitTestShape,
  translateShape,
} from '@/features/drawing/geometry';
import {
  DEFAULT_COLOR,
  ENDPOINT_HIT_RADIUS,
  SELECT_HIT_RADIUS,
  type AngleShape,
  type CanvasSize,
  type CircleShape,
  type Color,
  type DrawingState,
  type FreehandShape,
  type LineShape,
  type PlaneShape,
  type Point,
  type Shape,
  type ShapeId,
  type Tool,
} from '@/features/drawing/types';

// Only tools whose canvas-gesture handler we've actually wired light
// up the canvas. Select uses tap + drag separately so it's included.
const ACTIVE_TOOLS: ReadonlySet<Tool> = new Set([
  'line',
  'freehand',
  'circle',
  'plane',
  'angle',
  'select',
]);

interface EndpointDrag {
  shapeId: ShapeId;
  endpoint: 'start' | 'end';
}

interface SelectDrag {
  shapeId: ShapeId;
  lastPoint: Point;
}

/** Angle-tool 3-tap in-flight state. */
interface PendingAngle {
  color: Color;
  vertex: Point;
  end1: Point | null;
}

interface UseDrawingReturn {
  // ── State ──
  tool: Tool;
  shapes: DrawingState;
  inProgress: Shape | null;
  pendingAngle: PendingAngle | null;
  selectedShapeId: ShapeId | null;
  color: Color;
  canvasSize: CanvasSize;
  isStroking: boolean;
  enabled: boolean;
  // ── Commands ──
  setTool: (tool: Tool) => void;
  setColor: (color: Color) => void;
  setCanvasSize: (size: CanvasSize) => void;
  /**
   * Replace the committed shapes wholesale. Used by the persistence
   * layer to load saved drawings on PlaybackScreen open. Resets
   * selection + in-progress state so the canvas is a clean read of
   * whatever was on disk.
   */
  hydrate: (shapes: DrawingState) => void;
  undo: () => void;
  clear: () => void;
  deleteSelected: () => void;
  deselect: () => void;
  /** Returns true when the tap was absorbed by a tool (so the parent
   *  shouldn't also toggle chrome). */
  onCanvasTap: (point: Point) => boolean;
  // ── Stroke handlers ──
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: () => void;
}

let nextId = 0;
function makeId(): ShapeId {
  nextId += 1;
  return `shape-${Date.now().toString(36)}-${nextId}`;
}

function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

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
  const [tool, setToolState] = useState<Tool>('none');
  const [shapes, setShapes] = useState<DrawingState>([]);
  const [inProgress, setInProgress] = useState<Shape | null>(null);
  const [pendingAngle, setPendingAngle] = useState<PendingAngle | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<ShapeId | null>(null);
  const [color, setColorState] = useState<Color>(DEFAULT_COLOR);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });
  const [isStroking, setIsStroking] = useState(false);

  const editingRef = useRef<EndpointDrag | null>(null);
  const moveRef = useRef<SelectDrag | null>(null);

  // ── Tool change cancels in-flight angle and clears edit state ──────
  const setTool = useCallback((next: Tool) => {
    setToolState(next);
    setPendingAngle(null);
    editingRef.current = null;
    moveRef.current = null;
    // Deselect when leaving Select mode so the trash icon goes away.
    if (next !== 'select') setSelectedShapeId(null);
  }, []);

  // ── Color: also recolors the currently-selected shape ──────────────
  const setColor = useCallback(
    (next: Color) => {
      setColorState(next);
      if (selectedShapeId !== null) {
        setShapes(prev =>
          prev.map(s => (s.id === selectedShapeId ? { ...s, color: next } : s)),
        );
      }
    },
    [selectedShapeId],
  );

  const deselect = useCallback(() => setSelectedShapeId(null), []);

  const deleteSelected = useCallback(() => {
    if (selectedShapeId === null) return;
    setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
    setSelectedShapeId(null);
  }, [selectedShapeId]);

  const hydrate = useCallback((next: DrawingState) => {
    setShapes(next);
    setInProgress(null);
    setPendingAngle(null);
    setSelectedShapeId(null);
  }, []);

  const undo = useCallback(() => {
    setShapes(prev => (prev.length === 0 ? prev : prev.slice(0, -1)));
  }, []);

  const clear = useCallback(() => {
    setShapes([]);
    setSelectedShapeId(null);
  }, []);

  // ── Tap dispatch ───────────────────────────────────────────────────
  const onCanvasTap = useCallback(
    (point: Point): boolean => {
      // Angle tool: 3-tap state machine.
      if (tool === 'angle') {
        if (!pendingAngle) {
          setPendingAngle({ color, vertex: point, end1: null });
          return true;
        }
        if (pendingAngle.end1 === null) {
          setPendingAngle({ ...pendingAngle, end1: point });
          return true;
        }
        const shape: AngleShape = {
          id: makeId(),
          kind: 'angle',
          color: pendingAngle.color,
          vertex: pendingAngle.vertex,
          end1: pendingAngle.end1,
          end2: point,
        };
        setShapes(prev => [...prev, shape]);
        setPendingAngle(null);
        return true;
      }

      // Select tool: hit-test or deselect. Only consume the tap when
      // we actually selected something — empty-space taps deselect AND
      // fall through to the chrome toggle so the user can reach the
      // playback controls in the same gesture.
      if (tool === 'select') {
        const hit = hitTestShape(shapes, point, SELECT_HIT_RADIUS);
        setSelectedShapeId(hit?.id ?? null);
        return hit !== null;
      }

      // Other tools: tap is unhandled — parent toggles chrome.
      return false;
    },
    [tool, pendingAngle, color, shapes],
  );

  // ── Stroke lifecycle ───────────────────────────────────────────────
  const onStrokeStart = useCallback(
    (point: Point) => {
      setIsStroking(true);

      // Line endpoint drag wins over creating a new line.
      if (tool === 'line') {
        const hit = hitTestEndpoint(shapes, point);
        if (hit) {
          editingRef.current = hit;
          return;
        }
      }

      // Select tool: prepare to move the selected shape.
      if (tool === 'select') {
        if (selectedShapeId !== null) {
          // Only move if the drag starts within hit-range of the shape.
          const selectedShape = shapes.find(s => s.id === selectedShapeId);
          if (
            selectedShape &&
            hitTestShape([selectedShape], point, SELECT_HIT_RADIUS)
          ) {
            moveRef.current = { shapeId: selectedShapeId, lastPoint: point };
          }
        }
        return;
      }

      if (tool === 'line') {
        const shape: LineShape = {
          id: makeId(),
          kind: 'line',
          color,
          start: point,
          end: point,
        };
        setInProgress(shape);
      } else if (tool === 'freehand') {
        const shape: FreehandShape = {
          id: makeId(),
          kind: 'freehand',
          color,
          points: [point],
        };
        setInProgress(shape);
      } else if (tool === 'circle') {
        const shape: CircleShape = {
          id: makeId(),
          kind: 'circle',
          color,
          center: point,
          radius: 0,
        };
        setInProgress(shape);
      } else if (tool === 'plane') {
        const shape: PlaneShape = {
          id: makeId(),
          kind: 'plane',
          color,
          a: point,
          b: point,
        };
        setInProgress(shape);
      }
    },
    [tool, shapes, color, selectedShapeId],
  );

  const onStrokeMove = useCallback((point: Point) => {
    // Endpoint drag.
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

    // Select-tool move.
    const move = moveRef.current;
    if (move) {
      const dx = point.x - move.lastPoint.x;
      const dy = point.y - move.lastPoint.y;
      setShapes(prev =>
        prev.map(s => (s.id === move.shapeId ? translateShape(s, dx, dy) : s)),
      );
      moveRef.current = { ...move, lastPoint: point };
      return;
    }

    setInProgress(prev => {
      if (!prev) return prev;
      if (prev.kind === 'line') {
        return { ...prev, end: point };
      }
      if (prev.kind === 'freehand') {
        return { ...prev, points: [...prev.points, point] };
      }
      if (prev.kind === 'circle') {
        return { ...prev, radius: distance(prev.center, point) };
      }
      if (prev.kind === 'plane') {
        return { ...prev, b: point };
      }
      return prev;
    });
  }, []);

  const onStrokeEnd = useCallback(() => {
    setIsStroking(false);

    if (editingRef.current) {
      editingRef.current = null;
      return;
    }
    if (moveRef.current) {
      moveRef.current = null;
      return;
    }

    setInProgress(prev => {
      if (!prev) return null;
      // Degenerate stroke guards — drop misclicks instead of leaving
      // a zero-size artefact.
      if (prev.kind === 'line' && distance(prev.start, prev.end) < 4) {
        return null;
      }
      if (prev.kind === 'plane' && distance(prev.a, prev.b) < 4) {
        return null;
      }
      if (prev.kind === 'circle' && prev.radius < 4) {
        return null;
      }
      if (prev.kind === 'freehand' && prev.points.length < 2) {
        return null;
      }
      setShapes(s => [...s, prev]);
      return null;
    });
  }, []);

  return {
    tool,
    shapes,
    inProgress,
    pendingAngle,
    selectedShapeId,
    color,
    canvasSize,
    isStroking,
    enabled: ACTIVE_TOOLS.has(tool),
    setTool,
    setColor,
    setCanvasSize,
    hydrate,
    undo,
    clear,
    deleteSelected,
    deselect,
    onCanvasTap,
    onStrokeStart,
    onStrokeMove,
    onStrokeEnd,
  };
}
