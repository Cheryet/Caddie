/**
 * drawing/types — Domain types
 * Shared shapes between the canvas, the hook, the toolbar, and
 * (Phase 2.4) the persistence layer.
 *
 *   Point        — a 2D coordinate in canvas-local pixel space
 *   Tool         — the currently-selected drawing tool
 *   Color        — the four canonical annotation colors (per
 *                  DESIGN_SYSTEM §2 / colors.drawing.*); Phase 2.2
 *                  hardcodes 'white' until 2.3 wires the picker
 *   Shape        — discriminated union over the tool that produced it
 *   DrawingState — the array of committed shapes on the canvas
 *
 * Phase 2.4 will normalize shape coordinates to [0,1] before writing
 * to `videos.drawings`. For Phase 2.2 everything stays in raw pixel
 * space (matches what useDrawing receives from the gesture handler).
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Drawing tools. `'none'` is the disabled state (canvas pass-through);
 * Phase 2.2 wires `'line'` and `'freehand'`; remaining tools
 * (`'select'` / `'circle'` / `'angle'` / `'plane'`) are toggleable but
 * draw nothing until Phase 2.3 ships their handlers.
 */
export type Tool =
  | 'none'
  | 'select'
  | 'line'
  | 'freehand'
  | 'circle'
  | 'angle'
  | 'plane';

/**
 * Annotation color palette. Mirrors `colors.drawing.*` in the theme —
 * exposed as string literals here so persisted shapes have a stable
 * symbolic value instead of a hex code that could drift if the theme
 * shifts its palette.
 */
export type Color = 'white' | 'gold' | 'red' | 'blue';

export const DEFAULT_COLOR: Color = 'white';

/** Stable opaque id assigned at shape commit time. */
export type ShapeId = string;

interface ShapeBase {
  id: ShapeId;
  color: Color;
}

export interface LineShape extends ShapeBase {
  kind: 'line';
  start: Point;
  end: Point;
}

export interface FreehandShape extends ShapeBase {
  kind: 'freehand';
  /** Stroke points in chronological order. */
  points: Point[];
}

export interface CircleShape extends ShapeBase {
  kind: 'circle';
  center: Point;
  radius: number;
}

export interface PlaneShape extends ShapeBase {
  kind: 'plane';
  /** Two control points defining the line's direction. The rendered
   *  plane extends through both points all the way to the canvas
   *  edges; PlaneShape stays canonical regardless of canvas size. */
  a: Point;
  b: Point;
}

export interface AngleShape extends ShapeBase {
  kind: 'angle';
  vertex: Point;
  end1: Point;
  end2: Point;
}

/**
 * The full discriminated union of committed shapes. New `kind`
 * literals must keep the existing entries stable so persisted JSON
 * (Phase 2.4) written under one version still parses in a later one
 * — unknown kinds are dropped on read by the Zod schema.
 */
export type Shape =
  | LineShape
  | FreehandShape
  | CircleShape
  | PlaneShape
  | AngleShape;

export type DrawingState = Shape[];

/** Pixel radius for hit-testing line endpoints (Phase 2.2 endpoint drag). */
export const ENDPOINT_HIT_RADIUS = 20;

/** Pixel radius for general select-tool hit-testing (Phase 2.3). */
export const SELECT_HIT_RADIUS = 14;

export interface CanvasSize {
  width: number;
  height: number;
}
