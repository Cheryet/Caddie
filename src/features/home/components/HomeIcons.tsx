/**
 * HomeIcons — Feature icon set
 * The small SVG glyphs used across the Home dashboard. Path data is copied
 * verbatim from Design/Caddie Screens.dc.html §01 (flame L75, coaching star
 * L96, camera L106, compare L107, tempo L108, play L83). The Import glyph has
 * no prototype source (the prototype showed a Drills tile) so it's drawn in
 * the same line-art style. Centralised here so path data lives in one place —
 * mirrors analysis/components/AnalysisIcons.tsx.
 *
 * Part of: src/features/home/
 */

import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

interface IconProps {
  size?: number;
  color?: string;
}

const STROKE_W = 2;

/** Streak flame — the one gold accent in the stats row. */
export function FlameIcon({ size = 13, color = colors.gold.default }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2c1 5-3 6-3 10a3 3 0 0 0 6 0c0-1-.3-2-.8-2.7C15 11 16 12 16 14a4 4 0 0 1-8 0c0-4 4-7 4-12z" />
    </Svg>
  );
}

/** Five-point star — the AI mark on the coaching card. */
export function CoachingStarIcon({
  size = 18,
  color = colors.gold.default,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l2 5 5 .5-4 3.5 1.5 5L12 14l-4.5 3 1.5-5-4-3.5 5-.5z"
        stroke={color}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CameraIcon({
  size = 19,
  color = colors.text.primary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={13}
        r={3.5}
        stroke={color}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 8.5a2 2 0 0 1 2-2h1.2l1-1.6h5.6l1 1.6H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CompareIcon({
  size = 19,
  color = colors.text.primary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={5}
        width={8}
        height={14}
        rx={1.5}
        stroke={color}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x={13}
        y={5}
        width={8}
        height={14}
        rx={1.5}
        stroke={color}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TempoIcon({
  size = 19,
  color = colors.text.primary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 18.5a8 8 0 1 1 16 0"
        stroke={color}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={12}
        y1={14}
        x2={16.5}
        y2={9}
        stroke={color}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Tray-with-down-arrow — no prototype glyph; drawn to match the line set. */
export function ImportIcon({
  size = 19,
  color = colors.text.primary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 14.5V18a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-3.5"
        stroke={color}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 4v10M8 10l4 4 4-4"
        stroke={color}
        strokeWidth={STROKE_W}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Solid play triangle — the latest-swing card affordance. */
export function PlayIcon({
  size = 17,
  color = colors.text.primary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5l12 7-12 7z" />
    </Svg>
  );
}
