/**
 * Shapes — Feature components
 * Pure SVG renderers for the discriminated Shape union. The
 * DrawingCanvas mounts these inside its <Svg> root; no logic, no
 * gestures — just pixel-mapped geometry.
 *
 * Color comes from the `Shape.color` token and is resolved here
 * against `colors.drawing.*` so shapes can be persisted with stable
 * symbolic names (Phase 2.4) instead of theme-coupled hex codes.
 *
 * Phase 2.3 adds circle, plane (extends-to-canvas), and angle
 * (with degree readout). A `selected` flag adds a halo and the
 * endpoint handles for editable shapes.
 */

import {
  Circle,
  G,
  Line as SvgLine,
  Path,
  Text as SvgText,
} from 'react-native-svg';
import type { ReactElement } from 'react';

import { colors } from '@/theme';
import { angleDegrees, extendLineToCanvas } from '@/features/drawing/geometry';
import type {
  AngleShape,
  CanvasSize,
  CircleShape,
  Color,
  FreehandShape,
  LineShape,
  PlaneShape,
  Point,
  Shape,
} from '@/features/drawing/types';

const STROKE_WIDTH = 3;
const SELECTED_STROKE_WIDTH = 4;
const HALO_OPACITY = 0.35;
const HALO_OFFSET = 4;
const ANGLE_LABEL_OFFSET = 14;

function resolveColor(color: Color): string {
  return colors.drawing[color];
}

// ───── Line ──────────────────────────────────────────────────────────────

interface LineShapeViewProps {
  shape: LineShape;
  showEndpoints?: boolean;
  selected?: boolean;
}

export function LineShapeView({
  shape,
  showEndpoints,
  selected,
}: LineShapeViewProps) {
  const stroke = resolveColor(shape.color);
  const width = selected ? SELECTED_STROKE_WIDTH : STROKE_WIDTH;
  return (
    <>
      {selected ? (
        <SvgLine
          x1={shape.start.x}
          y1={shape.start.y}
          x2={shape.end.x}
          y2={shape.end.y}
          stroke={colors.gold.default}
          strokeWidth={width + HALO_OFFSET}
          strokeLinecap="round"
          opacity={HALO_OPACITY}
        />
      ) : null}
      <SvgLine
        x1={shape.start.x}
        y1={shape.start.y}
        x2={shape.end.x}
        y2={shape.end.y}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
      />
      {showEndpoints ? (
        <>
          <Circle cx={shape.start.x} cy={shape.start.y} r={6} fill={stroke} />
          <Circle cx={shape.end.x} cy={shape.end.y} r={6} fill={stroke} />
        </>
      ) : null}
    </>
  );
}

// ───── Freehand ──────────────────────────────────────────────────────────

interface FreehandShapeViewProps {
  shape: FreehandShape;
  selected?: boolean;
}

export function FreehandShapeView({
  shape,
  selected,
}: FreehandShapeViewProps) {
  if (shape.points.length < 2) return null;
  const d = pointsToPath(shape.points);
  const stroke = resolveColor(shape.color);
  const width = selected ? SELECTED_STROKE_WIDTH : STROKE_WIDTH;
  return (
    <>
      {selected ? (
        <Path
          d={d}
          stroke={colors.gold.default}
          strokeWidth={width + HALO_OFFSET}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={HALO_OPACITY}
        />
      ) : null}
      <Path
        d={d}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </>
  );
}

// ───── Circle ────────────────────────────────────────────────────────────

interface CircleShapeViewProps {
  shape: CircleShape;
  selected?: boolean;
}

export function CircleShapeView({ shape, selected }: CircleShapeViewProps) {
  const stroke = resolveColor(shape.color);
  const width = selected ? SELECTED_STROKE_WIDTH : STROKE_WIDTH;
  return (
    <>
      {selected ? (
        <Circle
          cx={shape.center.x}
          cy={shape.center.y}
          r={shape.radius}
          stroke={colors.gold.default}
          strokeWidth={width + HALO_OFFSET}
          fill="none"
          opacity={HALO_OPACITY}
        />
      ) : null}
      <Circle
        cx={shape.center.x}
        cy={shape.center.y}
        r={shape.radius}
        stroke={stroke}
        strokeWidth={width}
        fill="none"
      />
    </>
  );
}

// ───── Plane (extends to canvas edges) ──────────────────────────────────

interface PlaneShapeViewProps {
  shape: PlaneShape;
  canvasSize: CanvasSize;
  selected?: boolean;
}

export function PlaneShapeView({
  shape,
  canvasSize,
  selected,
}: PlaneShapeViewProps) {
  if (canvasSize.width === 0 || canvasSize.height === 0) {
    // Before onLayout fires we have no size; render the bare segment
    // so the in-progress feedback isn't completely invisible.
    return (
      <LineShapeView
        shape={{
          ...shape,
          kind: 'line',
          start: shape.a,
          end: shape.b,
        }}
        selected={selected}
      />
    );
  }
  const ext = extendLineToCanvas(shape.a, shape.b, canvasSize);
  if (!ext) return null;
  const stroke = resolveColor(shape.color);
  const width = selected ? SELECTED_STROKE_WIDTH : STROKE_WIDTH;
  return (
    <>
      {selected ? (
        <SvgLine
          x1={ext.p1.x}
          y1={ext.p1.y}
          x2={ext.p2.x}
          y2={ext.p2.y}
          stroke={colors.gold.default}
          strokeWidth={width + HALO_OFFSET}
          opacity={HALO_OPACITY}
        />
      ) : null}
      <SvgLine
        x1={ext.p1.x}
        y1={ext.p1.y}
        x2={ext.p2.x}
        y2={ext.p2.y}
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray="8 6"
      />
    </>
  );
}

// ───── Angle (with degree readout) ──────────────────────────────────────

interface AngleShapeViewProps {
  shape: AngleShape;
  selected?: boolean;
}

export function AngleShapeView({ shape, selected }: AngleShapeViewProps) {
  const stroke = resolveColor(shape.color);
  const width = selected ? SELECTED_STROKE_WIDTH : STROKE_WIDTH;
  const degrees = angleDegrees(shape.vertex, shape.end1, shape.end2);
  // Position the label inside the angle's bisector so it sits where
  // a protractor reading would appear.
  const labelPos = bisectorLabelPos(shape, ANGLE_LABEL_OFFSET);
  const haloElems: ReactElement[] = selected
    ? [
        <SvgLine
          key="halo-1"
          x1={shape.vertex.x}
          y1={shape.vertex.y}
          x2={shape.end1.x}
          y2={shape.end1.y}
          stroke={colors.gold.default}
          strokeWidth={width + HALO_OFFSET}
          strokeLinecap="round"
          opacity={HALO_OPACITY}
        />,
        <SvgLine
          key="halo-2"
          x1={shape.vertex.x}
          y1={shape.vertex.y}
          x2={shape.end2.x}
          y2={shape.end2.y}
          stroke={colors.gold.default}
          strokeWidth={width + HALO_OFFSET}
          strokeLinecap="round"
          opacity={HALO_OPACITY}
        />,
      ]
    : [];
  return (
    <G>
      {haloElems}
      <SvgLine
        x1={shape.vertex.x}
        y1={shape.vertex.y}
        x2={shape.end1.x}
        y2={shape.end1.y}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <SvgLine
        x1={shape.vertex.x}
        y1={shape.vertex.y}
        x2={shape.end2.x}
        y2={shape.end2.y}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <SvgText
        x={labelPos.x}
        y={labelPos.y}
        fill={stroke}
        fontSize={14}
        fontWeight="600"
        textAnchor="middle"
      >
        {`${degrees}°`}
      </SvgText>
    </G>
  );
}

// ───── Dispatcher ────────────────────────────────────────────────────────

interface ShapeViewProps {
  shape: Shape;
  /** Show endpoint handles for editable line shapes. */
  showLineEndpoints?: boolean;
  /** When true the shape renders with a gold halo. */
  selected?: boolean;
  /** Required for plane shapes; harmless for others. */
  canvasSize?: CanvasSize;
}

export function ShapeView({
  shape,
  showLineEndpoints,
  selected,
  canvasSize,
}: ShapeViewProps) {
  switch (shape.kind) {
    case 'line':
      return (
        <LineShapeView
          shape={shape}
          showEndpoints={showLineEndpoints}
          selected={selected}
        />
      );
    case 'freehand':
      return <FreehandShapeView shape={shape} selected={selected} />;
    case 'circle':
      return <CircleShapeView shape={shape} selected={selected} />;
    case 'plane':
      return (
        <PlaneShapeView
          shape={shape}
          canvasSize={canvasSize ?? { width: 0, height: 0 }}
          selected={selected}
        />
      );
    case 'angle':
      return <AngleShapeView shape={shape} selected={selected} />;
  }
}

// ───── Helpers ───────────────────────────────────────────────────────────

/** Build an SVG path `d` string from a list of points (M / L / L / …). */
export function pointsToPath(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  const start = `M ${first!.x} ${first!.y}`;
  const segments = rest.map(p => `L ${p.x} ${p.y}`).join(' ');
  return `${start} ${segments}`.trim();
}

/** Position the degree label along the angle's bisector, `offset` px
 *  from the vertex. */
function bisectorLabelPos(shape: AngleShape, offset: number): Point {
  const v1 = normalize(
    shape.end1.x - shape.vertex.x,
    shape.end1.y - shape.vertex.y,
  );
  const v2 = normalize(
    shape.end2.x - shape.vertex.x,
    shape.end2.y - shape.vertex.y,
  );
  const bx = v1.x + v2.x;
  const by = v1.y + v2.y;
  const bisector =
    bx === 0 && by === 0 ? { x: 1, y: 0 } : normalize(bx, by);
  return {
    x: shape.vertex.x + bisector.x * offset * 3,
    y: shape.vertex.y + bisector.y * offset * 3,
  };
}

function normalize(x: number, y: number): Point {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}
