/**
 * useDrawing — Feature hook
 * Owns the drawing canvas's local state. Phase 2.1 keeps this minimal
 * since there are no tools yet:
 *
 *   - `tool`         — currently selected tool ('none' by default)
 *   - `setTool`      — switches tool; toggling away from 'none'
 *                       enables touch capture on the canvas
 *   - `enabled`      — derived (`tool !== 'none'`). The canvas reads
 *                       this to decide whether to intercept gestures.
 *   - `isStroking`   — true between onStrokeStart and onStrokeEnd;
 *                       Phase 2.2 will use this to gate undo + auto-
 *                       save behaviors.
 *   - stroke handlers — passed to <DrawingCanvas onStroke*={...}>;
 *                       Phase 2.2 will accumulate shapes here.
 *
 * Used by: PlaybackScreen.
 */

import { useCallback, useState } from 'react';

import type { Point, Tool } from '@/features/drawing/types';

interface UseDrawingReturn {
  tool: Tool;
  setTool: (tool: Tool) => void;
  /** True when the user is actively dragging on the canvas. */
  isStroking: boolean;
  /** Derived from `tool` — true when the canvas should capture touches. */
  enabled: boolean;
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: () => void;
}

export function useDrawing(): UseDrawingReturn {
  const [tool, setTool] = useState<Tool>('none');
  const [isStroking, setIsStroking] = useState(false);

  const onStrokeStart = useCallback((_point: Point) => {
    // Phase 2.1 just records that a stroke is in progress; Phase 2.2
    // will start an in-progress shape here.
    setIsStroking(true);
  }, []);

  const onStrokeMove = useCallback((_point: Point) => {
    // Phase 2.1 is a no-op; Phase 2.2 will extend the active shape.
  }, []);

  const onStrokeEnd = useCallback(() => {
    setIsStroking(false);
  }, []);

  return {
    tool,
    setTool,
    isStroking,
    enabled: tool !== 'none',
    onStrokeStart,
    onStrokeMove,
    onStrokeEnd,
  };
}
