/**
 * CameraIcons — Custom SVG icons for the camera capture chrome
 * Paths copied VERBATIM from Design/Caddie Screens.dc.html (CameraScreen
 * section, lines 290–390). Do not substitute SF Symbols.
 *
 * Each icon takes a `color` and an optional `size`. Defaults match the
 * design source so callers only need to override when their button slot
 * requires a different scale.
 */

import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

interface CameraIconProps {
  color: string;
  size?: number;
}

export function CloseIcon({ color, size = 18 }: CameraIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line
        x1={6}
        y1={6}
        x2={18}
        y2={18}
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Line
        x1={18}
        y1={6}
        x2={6}
        y2={18}
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GridIcon({ color, size = 18 }: CameraIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={3}
        width={18}
        height={18}
        rx={2}
        stroke={color}
        strokeWidth={1.8}
      />
      <Line x1={9} y1={3} x2={9} y2={21} stroke={color} strokeWidth={1.8} />
      <Line x1={15} y1={3} x2={15} y2={21} stroke={color} strokeWidth={1.8} />
      <Line x1={3} y1={9} x2={21} y2={9} stroke={color} strokeWidth={1.8} />
      <Line x1={3} y1={15} x2={21} y2={15} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function CameraFlipIcon({ color, size = 22 }: CameraIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9a9 9 0 0 1 15-3l3 3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 15a9 9 0 0 1-15 3l-3-3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="21 3 21 9 15 9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="3 21 3 15 9 15"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Info glyph used in the footer note. Outer circle with a vertical
 * stroke and a small dot for the "i" — matches Design/Caddie Screens.dc.html
 * line 389 exactly.
 */
export function InfoIcon({ color, size = 16 }: CameraIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <Line x1={12} y1={11} x2={12} y2={16} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={7.5} r={0.5} fill={color} />
    </Svg>
  );
}
