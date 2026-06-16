/**
 * Shapes — Feature components
 * Pure SVG renderers for the discriminated Shape union. The
 * DrawingCanvas mounts these inside its <Svg> root; no logic, no
 * gestures — Just pixel-mapped geometry.
 *
 * Color comes from the `Shape.color` token and is resolved here
 * against `colors.drawing.*` so shapes can be persisted with stable
 * symbolic names (Phase 2.4) instead of theme-coupled hex codes.
 */

import { Circle, Line as SvgLine, Path } from 'react-native-svg';

import { colors } from '@/theme';
import type {
  Color,
  FreehandShape,
  LineShape,
  Point,
  Shape,
} from '@/features/drawing/types';

const STROKE_WIDTH = 3;

function resolveColor(color: Color): string {
  return colors.drawing[color];
}

interface LineShapeViewProps {
  shape: LineShape;
  /** When true, render small handles at each endpoint (drag affordance). */
  showEndpoints?: boolean;
}

export function LineShapeView({
  shape,
  showEndpoints,
}: LineShapeViewProps) {
  const stroke = resolveColor(shape.color);
  return (
    <>
      <SvgLine
        x1={shape.start.x}
        y1={shape.start.y}
        x2={shape.end.x}
        y2={shape.end.y}
        stroke={stroke}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      {showEndpoints ? (
        <>
          <Circle
            cx={shape.start.x}
            cy={shape.start.y}
            r={6}
            fill={stroke}
          />
          <Circle
            cx={shape.end.x}
            cy={shape.end.y}
            r={6}
            fill={stroke}
          />
        </>
      ) : null}
    </>
  );
}

interface FreehandShapeViewProps {
  shape: FreehandShape;
}

export function FreehandShapeView({ shape }: FreehandShapeViewProps) {
  if (shape.points.length < 2) return null;
  return (
    <Path
      d={pointsToPath(shape.points)}
      stroke={resolveColor(shape.color)}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

interface ShapeViewProps {
  shape: Shape;
  /** Show endpoint handles for editable line shapes (Phase 2.2). */
  showLineEndpoints?: boolean;
}

export function ShapeView({ shape, showLineEndpoints }: ShapeViewProps) {
  if (shape.kind === 'line') {
    return <LineShapeView shape={shape} showEndpoints={showLineEndpoints} />;
  }
  return <FreehandShapeView shape={shape} />;
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
