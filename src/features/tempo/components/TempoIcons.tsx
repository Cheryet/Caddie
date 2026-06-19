/**
 * TempoIcons — Feature icon set
 * The glyphs used on the Tempo screen. Path data is copied verbatim from
 * Design/Caddie Screens.dc.html §07 (play L1700, pause L1703, minus L1695,
 * plus L1708, clock L1739, preset-plus L1729). Centralised here so the path
 * data lives in one place — mirrors home/components/HomeIcons.tsx.
 *
 * Part of: src/features/tempo/
 */

import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { colors } from '@/theme';

interface IconProps {
  size?: number;
  color?: string;
}

/** Transport play — sits on the gold button, hence the inverse default. */
export function PlayIcon({ size = 34, color = colors.text.inverse }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5.5v13l11-6.5z" />
    </Svg>
  );
}

export function PauseIcon({ size = 30, color = colors.text.inverse }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Rect x={6} y={5.5} width={4.5} height={13} rx={1.2} />
      <Rect x={13.5} y={5.5} width={4.5} height={13} rx={1.2} />
    </Svg>
  );
}

export function MinusIcon({ size = 24, color = colors.text.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line
        x1={5}
        y1={12}
        x2={19}
        y2={12}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PlusIcon({ size = 24, color = colors.text.primary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line
        x1={12}
        y1={5}
        x2={12}
        y2={19}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <Line
        x1={5}
        y1={12}
        x2={19}
        y2={12}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Clock — the 3:1 tour-tempo guide header. */
export function ClockIcon({ size = 17, color = colors.gold.default }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={12}
        r={9}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="12 7 12 12 15.5 14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Plus inside an empty preset slot. */
export function PresetPlusIcon({
  size = 22,
  color = colors.text.tertiary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line
        x1={12}
        y1={6}
        x2={12}
        y2={18}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1={6}
        y1={12}
        x2={18}
        y2={12}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
