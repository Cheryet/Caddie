/**
 * ProfileIcons — Feature icon set
 * The row/section glyphs for ProfileScreen. Path data copied verbatim from
 * Design/Caddie Screens.dc.html §06 (L1014–1145). Stroke icons default to
 * the design's neutral `text.secondary`; the chevron to `text.tertiary`; the
 * Pro crown is a gold fill. Centralised here — mirrors home/HomeIcons.tsx.
 *
 * Part of: src/features/profile/
 */

import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

import { colors } from '@/theme';

interface IconProps {
  size?: number;
  color?: string;
}

const STROKE = 2;

function strokeProps(color: string) {
  return {
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

export function SettingsStarIcon({
  size = 19,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l1.9 4.3 4.6.4-3.5 3 1.1 4.6L12 13.9 7.9 15.3 9 10.7 5.5 7.7l4.6-.4z"
        {...strokeProps(color)}
      />
    </Svg>
  );
}

export function PencilIcon({
  size = 12,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 20h9" {...strokeProps(color)} />
      <Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" {...strokeProps(color)} />
    </Svg>
  );
}

/** The Caddie Pro crown — gold fill, the subscription card's mark. */
export function CrownIcon({ size = 20, color = colors.gold.default }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-1.6 10.5H4.6z" />
    </Svg>
  );
}

export function TicketIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"
        {...strokeProps(color)}
      />
      <Path d="M9.5 7.5v9" {...strokeProps(color)} strokeDasharray="1.5 2.5" />
    </Svg>
  );
}

export function UserIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={9} r={3.2} {...strokeProps(color)} />
      <Circle cx={12} cy={12} r={9.5} {...strokeProps(color)} />
      <Path d="M5.5 19a6.7 6.7 0 0 1 13 0" {...strokeProps(color)} />
    </Svg>
  );
}

export function MailIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={2.5} {...strokeProps(color)} />
      <Path d="M3.5 6.5L12 13l8.5-6.5" {...strokeProps(color)} />
    </Svg>
  );
}

export function LockIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={10.5} width={16} height={10} rx={2.5} {...strokeProps(color)} />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...strokeProps(color)} />
    </Svg>
  );
}

export function FlagIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 21V4" {...strokeProps(color)} />
      <Path d="M6 4h11l-2.2 3L17 10H6" {...strokeProps(color)} />
    </Svg>
  );
}

/** Flagstick on a green — the Default-club row. */
export function ClubIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 3v15" {...strokeProps(color)} />
      <Path d="M8 4l8 2.2L8 8.4" {...strokeProps(color)} />
      <Path d="M4.5 18.5c2-1 13-1 15 0" {...strokeProps(color)} />
    </Svg>
  );
}

export function DominantHandIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11" {...strokeProps(color)} />
      <Path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11" {...strokeProps(color)} />
      <Path d="M14 11V5.5a1.5 1.5 0 0 1 3 0V12" {...strokeProps(color)} />
      <Path
        d="M17 9.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.4-2L5 16c-.7-.9.4-2.2 1.4-1.6L8 15.5V8.5"
        {...strokeProps(color)}
      />
    </Svg>
  );
}

export function CameraIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8.5a2 2 0 0 1 2-2h1.2l1-1.6h5.6l1 1.6H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"
        {...strokeProps(color)}
      />
      <Circle cx={12} cy={13} r={3.3} {...strokeProps(color)} />
    </Svg>
  );
}

export function SparkleIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" {...strokeProps(color)} />
      <Path
        d="M18.5 4.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"
        {...strokeProps(color)}
      />
    </Svg>
  );
}

export function PoseFigureIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={13} cy={4.5} r={1.8} fill={color} />
      <Path d="M13 8l-2 5 3 2 1 6" {...strokeProps(color)} />
      <Path d="M11 13l-4 2" {...strokeProps(color)} />
      <Path d="M9 22l2-7" {...strokeProps(color)} />
    </Svg>
  );
}

export function BellIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" {...strokeProps(color)} />
      <Path d="M10 19a2 2 0 0 0 4 0" {...strokeProps(color)} />
    </Svg>
  );
}

export function ChartIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 19V5" {...strokeProps(color)} />
      <Path d="M4 19h16" {...strokeProps(color)} />
      <Polyline points="7 14 11 10 14 13 19 7" {...strokeProps(color)} />
    </Svg>
  );
}

export function HelpIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} {...strokeProps(color)} />
      <Path d="M9.3 9.2a2.7 2.7 0 0 1 5.2 1c0 1.8-2.7 2.3-2.7 4" {...strokeProps(color)} />
      <Circle cx={12} cy={17} r={0.6} fill={color} />
    </Svg>
  );
}

export function ShieldIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" {...strokeProps(color)} />
    </Svg>
  );
}

/** Show-password eye — path verbatim from the Change-password design field. */
export function EyeIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" {...strokeProps(color)} />
      <Circle cx={12} cy={12} r={3} {...strokeProps(color)} />
    </Svg>
  );
}

/** Hide-password eye — the design only shows the open eye, so the struck-through
 *  variant uses the matching Feather "eye-off" the open eye is drawn from. */
export function EyeOffIcon({
  size = 20,
  color = colors.text.secondary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
        {...strokeProps(color)}
      />
      <Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" {...strokeProps(color)} />
      <Path d="M3 3l18 18" {...strokeProps(color)} />
    </Svg>
  );
}

export function ChevronIcon({
  size = 18,
  color = colors.text.tertiary,
}: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="9 6 15 12 9 18" {...strokeProps(color)} />
    </Svg>
  );
}
