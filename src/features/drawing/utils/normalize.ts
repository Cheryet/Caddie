/**
 * drawing/utils/normalize — Coordinate normalization for persistence
 * Phase 2.1 left shape coordinates in raw pixel space (canvas-local).
 * Phase 2.4 round-trips them through `videos.drawings` JSON, which
 * needs to be device-independent: an iPhone SE (375pt) and an iPhone
 * 17 Pro (393pt) must replay the same drawing.
 *
 * Convention: persisted coords are in `[0,1]` relative to the canvas
 * width/height at draw time. On load we multiply by the current
 * canvas size to recover pixels.
 *
 * The persisted JSON carries a `v` version marker so we can evolve
 * the shape later (e.g., adding new Shape kinds) without breaking
 * old data. v1 is what Phase 2.4 ships.
 */

import { z } from 'zod';

import type {
  AngleShape,
  CanvasSize,
  CircleShape,
  DrawingState,
  FreehandShape,
  LineShape,
  PlaneShape,
  Point,
  Shape,
} from '@/features/drawing/types';

// ───── Zod schema for persisted JSON ────────────────────────────────────

const PersistedPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const PersistedColorSchema = z.enum(['white', 'gold', 'red', 'blue']);

const BaseShape = z.object({
  id: z.string(),
  color: PersistedColorSchema,
});

const PersistedLineSchema = BaseShape.extend({
  kind: z.literal('line'),
  start: PersistedPointSchema,
  end: PersistedPointSchema,
});

const PersistedFreehandSchema = BaseShape.extend({
  kind: z.literal('freehand'),
  points: z.array(PersistedPointSchema).min(2),
});

const PersistedCircleSchema = BaseShape.extend({
  kind: z.literal('circle'),
  center: PersistedPointSchema,
  radius: z.number().nonnegative(),
});

const PersistedPlaneSchema = BaseShape.extend({
  kind: z.literal('plane'),
  a: PersistedPointSchema,
  b: PersistedPointSchema,
});

const PersistedAngleSchema = BaseShape.extend({
  kind: z.literal('angle'),
  vertex: PersistedPointSchema,
  end1: PersistedPointSchema,
  end2: PersistedPointSchema,
});

const PersistedShapeSchema = z.discriminatedUnion('kind', [
  PersistedLineSchema,
  PersistedFreehandSchema,
  PersistedCircleSchema,
  PersistedPlaneSchema,
  PersistedAngleSchema,
]);

export const PersistedDrawingSchema = z.object({
  v: z.literal(1),
  shapes: z.array(PersistedShapeSchema),
});

export type PersistedDrawing = z.infer<typeof PersistedDrawingSchema>;

// ───── Normalization (px → [0,1]) ───────────────────────────────────────

function normalizePoint(p: Point, size: CanvasSize): Point {
  if (size.width === 0 || size.height === 0) return p;
  return { x: p.x / size.width, y: p.y / size.height };
}

function denormalizePoint(p: Point, size: CanvasSize): Point {
  return { x: p.x * size.width, y: p.y * size.height };
}

function normalizeShape(shape: Shape, size: CanvasSize): Shape {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        start: normalizePoint(shape.start, size),
        end: normalizePoint(shape.end, size),
      };
    case 'freehand':
      return {
        ...shape,
        points: shape.points.map(p => normalizePoint(p, size)),
      };
    case 'circle': {
      // Radius is in the *shorter* dimension so the proportions hold
      // when replayed on a differently-shaped canvas. The video frame
      // and canvas share aspect ratio via `resizeMode=contain`, so
      // either dimension works, but using width is the convention.
      const reference = size.width === 0 ? 1 : size.width;
      return {
        ...shape,
        center: normalizePoint(shape.center, size),
        radius: shape.radius / reference,
      };
    }
    case 'plane':
      return {
        ...shape,
        a: normalizePoint(shape.a, size),
        b: normalizePoint(shape.b, size),
      };
    case 'angle':
      return {
        ...shape,
        vertex: normalizePoint(shape.vertex, size),
        end1: normalizePoint(shape.end1, size),
        end2: normalizePoint(shape.end2, size),
      };
  }
}

function denormalizeShape(shape: Shape, size: CanvasSize): Shape {
  switch (shape.kind) {
    case 'line':
      return {
        ...shape,
        start: denormalizePoint(shape.start, size),
        end: denormalizePoint(shape.end, size),
      };
    case 'freehand':
      return {
        ...shape,
        points: shape.points.map(p => denormalizePoint(p, size)),
      };
    case 'circle': {
      const reference = size.width === 0 ? 1 : size.width;
      return {
        ...shape,
        center: denormalizePoint(shape.center, size),
        radius: shape.radius * reference,
      };
    }
    case 'plane':
      return {
        ...shape,
        a: denormalizePoint(shape.a, size),
        b: denormalizePoint(shape.b, size),
      };
    case 'angle':
      return {
        ...shape,
        vertex: denormalizePoint(shape.vertex, size),
        end1: denormalizePoint(shape.end1, size),
        end2: denormalizePoint(shape.end2, size),
      };
  }
}

// ───── Public API ───────────────────────────────────────────────────────

/** Convert pixel-space shapes to the on-disk JSON shape. */
export function toPersisted(
  shapes: DrawingState,
  size: CanvasSize,
): PersistedDrawing {
  const normalized = shapes.map(s => normalizeShape(s, size));
  // The runtime type is still `Shape` (raw); persisted Zod parses are
  // structurally identical. Cast through the schema for clarity.
  return PersistedDrawingSchema.parse({
    v: 1,
    shapes: normalized,
  });
}

/**
 * Parse + denormalize stored JSON into pixel-space shapes. Returns
 * `null` when the input is null, undefined, or fails Zod validation
 * — the caller decides how to surface the failure (Phase 2.4 toasts).
 */
export function fromPersisted(
  raw: unknown,
  size: CanvasSize,
): { shapes: DrawingState } | { error: 'invalid' } | null {
  if (raw === null || raw === undefined) return null;
  const parsed = PersistedDrawingSchema.safeParse(raw);
  if (!parsed.success) return { error: 'invalid' };
  const shapes = parsed.data.shapes.map(s =>
    denormalizeShape(s as Shape, size),
  );
  // Re-narrow against the runtime types — the persisted schema's
  // discriminator names are identical to the runtime Shape union.
  const cast: DrawingState = shapes as Array<
    LineShape | FreehandShape | CircleShape | PlaneShape | AngleShape
  >;
  return { shapes: cast };
}
