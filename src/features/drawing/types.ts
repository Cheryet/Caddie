/**
 * drawing/types — Domain types
 * Shared shapes between the canvas, the hook, and (later) the
 * toolbar. Phase 2.1 only defines the foundation:
 *   - `Point` — a 2D coordinate in the canvas's local pixel space
 *   - `Tool` — the currently-selected drawing tool. `'none'` means
 *     the canvas is in pass-through mode (taps fall through to the
 *     underlying player).
 *
 * Phase 2.2+ will add `Shape` (the rendered geometry) and
 * `DrawingState` (an array of shapes). Phase 2.4 will persist
 * normalized `Shape`s to `videos.drawings`.
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Drawing tools. `'none'` is the disabled state; remaining members are
 * filled in by Phase 2.2 (line / freehand) and 2.3 (circle / angle /
 * plane / select). Listing them up front so types stay stable as
 * the toolbar lands.
 */
export type Tool =
  | 'none'
  | 'select'
  | 'line'
  | 'freehand'
  | 'circle'
  | 'angle'
  | 'plane';
