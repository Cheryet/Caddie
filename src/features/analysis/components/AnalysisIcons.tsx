/**
 * AnalysisIcons — Custom SVG icons for the analysis report
 * Paths copied VERBATIM from Design/Caddie Screens.dc.html (§03 Analysis,
 * lines 423–539). Do not substitute SF Symbols — the design defines these
 * glyphs explicitly. Each takes a `color` and optional `size`; defaults
 * match the design source.
 *
 * Part of: src/features/analysis/
 */

import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

import type { IssueSeverity } from '@/types/analysis';

interface IconProps {
  color: string;
  size?: number;
}

/** Sparkle / AI mark — the loading hero glyph (fill, two stars). */
export function SparkleIcon({ color, size = 32 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6z" />
      <Path d="M19 14l.7 2.1 2.3.7-2.3.7-.7 2.1-.7-2.1-2.3-.7 2.3-.7z" />
    </Svg>
  );
}

/** Checkmark — positives list + the loading staged-progress rows. */
export function CheckIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="4 12 10 18 20 6"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Play triangle — drill card thumbnail. */
export function PlayIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5l12 7-12 7z" />
    </Svg>
  );
}

/** Back chevron — screen header (returns to playback). */
export function BackChevronIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="15 5 8 12 15 19"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Forward chevron — disclosure affordance on a tappable IssueCard. Mirror
 *  of BackChevronIcon so the stroke weight matches the icon family. */
export function ForwardChevronIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="9 5 16 12 9 19"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Share / export — screen header right action. */
export function ShareIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15V3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 7l4-4 4 4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 12v7h14v-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Close X — loading state header (cancel analysis). */
export function CloseIcon({ color, size = 20 }: IconProps) {
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

interface SeverityIconProps extends IconProps {
  severity: IssueSeverity;
}

/**
 * Severity glyph for the IssueCard icon tile. Each severity has its own
 * mark (verbatim from the design): major = exclamation, moderate = warning
 * triangle, minor = info circle. `color` is the per-severity stroke
 * (the matching Badge text colour).
 */
export function SeverityIcon({ severity, color, size = 16 }: SeverityIconProps) {
  if (severity === 'major') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Line
          x1={12}
          y1={6}
          x2={12}
          y2={13}
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <Circle cx={12} cy={17.5} r={0.6} fill={color} />
      </Svg>
    );
  }
  if (severity === 'moderate') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 4L2 20h20z"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Line
          x1={12}
          y1={11}
          x2={12}
          y2={14.5}
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  // minor — info circle
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2.2} />
      <Line
        x1={12}
        y1={11}
        x2={12}
        y2={16}
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={7.8} r={0.6} fill={color} />
    </Svg>
  );
}
