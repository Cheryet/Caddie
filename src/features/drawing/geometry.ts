/**
 * drawing/geometry — Pure geometry helpers
 * Hit-testing, line extension, and angle math used by the drawing
 * canvas + Select tool. All functions take and return plain numbers /
 * `Point`s — no React, no native modules.
 *
 * Coordinate system convention: pixel space with x increasing right
 * and y increasing down (standard SVG / DOM). All distances are in
 * pixels in the canvas's local frame.
 */

import type { CanvasSize, Point, Shape } from './types';

// ───── Basic distances ──────────────────────────────────────────────────

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Shortest distance from point `p` to the line segment AB. Returns
 * `distance(p, A)` when the segment is degenerate.
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(p, a);
  // Project p onto AB, clamped to [0,1] along the segment.
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq),
  );
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return distance(p, proj);
}

/**
 * Distance from `p` to the infinite line through `a` and `b` (not
 * clamped to the segment). Used by the Plane tool's hit-test since a
 * plane line extends beyond its control points.
 */
export function distanceToLine(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return distance(p, a);
  // Standard "cross product divided by length" formula.
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / length;
}

// ───── Plane-line extension ─────────────────────────────────────────────

/**
 * Extend the line through `a` and `b` to the canvas's bounding
 * rectangle. Returns the two intersection points (one per edge) the
 * line crosses, in no particular order. When the two control points
 * are coincident (no direction), returns null.
 */
export function extendLineToCanvas(
  a: Point,
  b: Point,
  size: CanvasSize,
): { p1: Point; p2: Point } | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return null;

  const { width, height } = size;

  // Parameterise as a + t*(b - a). Find the two t values where the
  // line meets the rectangle [0,width] × [0,height], then pick the
  // outermost pair so the segment spans the canvas.
  const ts: number[] = [];
  if (dx !== 0) {
    ts.push(-a.x / dx); // x = 0
    ts.push((width - a.x) / dx); // x = width
  }
  if (dy !== 0) {
    ts.push(-a.y / dy); // y = 0
    ts.push((height - a.y) / dy); // y = height
  }

  // Keep only ts whose evaluated point lies within the rectangle (with
  // a tiny epsilon for floating-point edge hits).
  const eps = 0.001;
  const valid = ts
    .map(t => ({ t, x: a.x + t * dx, y: a.y + t * dy }))
    .filter(
      pt =>
        pt.x >= -eps &&
        pt.x <= width + eps &&
        pt.y >= -eps &&
        pt.y <= height + eps,
    );
  if (valid.length < 2) return null;

  valid.sort((p, q) => p.t - q.t);
  const first = valid[0]!;
  const last = valid[valid.length - 1]!;
  return {
    p1: { x: first.x, y: first.y },
    p2: { x: last.x, y: last.y },
  };
}

// ───── Angle (degrees) ──────────────────────────────────────────────────

/**
 * Interior angle at `vertex` formed by rays `vertex→end1` and
 * `vertex→end2`, in degrees rounded to the nearest whole number.
 * Returns 0 when either ray has zero length.
 */
export function angleDegrees(vertex: Point, end1: Point, end2: Point): number {
  const v1x = end1.x - vertex.x;
  const v1y = end1.y - vertex.y;
  const v2x = end2.x - vertex.x;
  const v2y = end2.y - vertex.y;
  const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (len1 === 0 || len2 === 0) return 0;
  const cos = (v1x * v2x + v1y * v2y) / (len1 * len2);
  // Clamp against floating-point drift outside [-1,1].
  const clamped = Math.max(-1, Math.min(1, cos));
  return Math.round((Math.acos(clamped) * 180) / Math.PI);
}

// ───── Select-tool hit-test ─────────────────────────────────────────────

/**
 * Find the topmost shape (last-committed wins) whose hit-region
 * contains `point`. Returns null when nothing is in range.
 *
 * Per-shape rules:
 *   line       — distance to the segment
 *   plane      — distance to the *infinite* line through the two pts
 *   circle     — distance from radius edge OR inside the disc
 *   freehand   — distance to any individual stroke point
 *   angle      — distance to either ray segment
 */
export function hitTestShape(
  shapes: Shape[],
  point: Point,
  radius: number,
): Shape | null {
  for (let i = shapes.length - 1; i >= 0; i -= 1) {
    const s = shapes[i];
    if (!s) continue;
    if (containsPoint(s, point, radius)) return s;
  }
  return null;
}

function containsPoint(shape: Shape, p: Point, radius: number): boolean {
  switch (shape.kind) {
    case 'line':
      return distanceToSegment(p, shape.start, shape.end) <= radius;
    case 'plane':
      return distanceToLine(p, shape.a, shape.b) <= radius;
    case 'circle': {
      const d = distance(p, shape.center);
      // Hit either on the perimeter (within radius) or inside the
      // entire disc — both are intuitive "select" affordances.
      return Math.abs(d - shape.radius) <= radius || d <= shape.radius;
    }
    case 'freehand':
      return shape.points.some(q => distance(p, q) <= radius);
    case 'angle':
      return (
        distanceToSegment(p, shape.vertex, shape.end1) <= radius ||
        distanceToSegment(p, shape.vertex, shape.end2) <= radius
      );
  }
}

// ───── Translation (Select-tool move) ───────────────────────────────────

/** Translate a shape by (dx, dy). Returns a new Shape — does not mutate. */
export function translateShape(shape: Shape, dx: number, dy: number): Shape {
  const off = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy });
  switch (shape.kind) {
    case 'line':
      return { ...shape, start: off(shape.start), end: off(shape.end) };
    case 'plane':
      return { ...shape, a: off(shape.a), b: off(shape.b) };
    case 'circle':
      return { ...shape, center: off(shape.center) };
    case 'freehand':
      return { ...shape, points: shape.points.map(off) };
    case 'angle':
      return {
        ...shape,
        vertex: off(shape.vertex),
        end1: off(shape.end1),
        end2: off(shape.end2),
      };
  }
}
