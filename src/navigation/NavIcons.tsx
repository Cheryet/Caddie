/**
 * NavIcons — Custom SVG icons for the bottom tab bar
 * Icon shapes copied VERBATIM from `Design/TabBar.dc.html`. Do not
 * substitute SF Symbols or any other library here — the design uses
 * custom paths for visual consistency and the tab bar must match it
 * pixel-for-pixel.
 *
 * Every icon is a 25×25 outline at viewBox 0 0 24 24 with stroke-width 2,
 * round caps/joins, no fill. `color` controls stroke. The Record icon
 * is a special case (fill-based) — see RecordIcon below.
 */

import Svg, { Circle, Path, Line } from 'react-native-svg';

interface NavIconProps {
  color: string;
  size?: number;
}

export function HomeIcon({ color, size = 25 }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11l9-7 9 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 9.5V20h13V9.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LibraryIcon({ color, size = 25 }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7.5a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TempoIcon({ color, size = 25 }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 18.5a8 8 0 1 1 16 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={12}
        y1={14}
        x2={16.5}
        y2={9}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={14} r={1.4} fill={color} />
    </Svg>
  );
}

export function ProfileIcon({ color, size = 25 }: NavIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={8}
        r={3.4}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

interface RecordIconProps {
  /** Outer ring stroke + inner dot fill. Both same colour per design. */
  color: string;
  size?: number;
}

/**
 * Record FAB glyph — outer circle outline + inner filled circle.
 * Matches Design/TabBar.dc.html exactly (radii 9 and 5 inside a 24-unit
 * viewBox; both ring and dot use the same colour).
 */
export function RecordIcon({ color, size = 30 }: RecordIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} fill="none" stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={5} fill={color} />
    </Svg>
  );
}
