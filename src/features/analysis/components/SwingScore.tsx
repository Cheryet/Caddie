/**
 * SwingScore — Feature component
 * The hero score ring on AnalysisScreen. A 0–100 score rendered as a mono
 * numeral inside a circular progress ring that animates from empty to the
 * score on mount (800ms ease-out, DESIGN_SYSTEM §5 + §8). Ring + label take
 * the score's BRACKET colour (see scoreBracket / TODO.md — gold stays the
 * screen's single CTA accent).
 *
 * Geometry is verbatim from Design/Caddie Screens.dc.html §03 (168px box,
 * r=74, 10px stroke, arc starting at 12 o'clock). Purely presentational.
 *
 * Part of: src/features/analysis/
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { scoreBracket } from '@/features/analysis/scoreBracket';
import { colors, typography } from '@/theme';

// Ring geometry in the fixed 168px viewBox (design source). The Svg scales
// to `size`, so these stay constant regardless of the rendered diameter.
const VIEWBOX = 168;
const CENTER = 84;
const RADIUS = 74;
const STROKE_WIDTH = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const RING_ANIMATION_MS = 800;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface SwingScoreProps {
  /** 0–100 swing score. */
  score: number;
  /** Rendered diameter in px. Defaults to the design's 168px hero. */
  size?: number;
}

export function SwingScore({ score, size = VIEWBOX }: SwingScoreProps) {
  const bracket = scoreBracket(score);
  const clamped = Math.max(0, Math.min(100, Number.isNaN(score) ? 0 : score));
  const displayScore = Math.round(clamped);

  // Fraction of the ring filled, 0–1.
  const fraction = clamped / 100;
  // dashoffset at rest (fully animated in): a smaller offset = more arc shown.
  const filledOffset = CIRCUMFERENCE * (1 - fraction);

  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    // Re-animate from empty whenever the score changes.
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: RING_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, reduceMotion, fraction]);

  // Animate strokeDashoffset from empty (CIRCUMFERENCE) to filledOffset.
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE - (CIRCUMFERENCE - filledOffset) * progress.value,
  }));

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="image"
      accessibilityLabel={`Swing score ${displayScore} out of 100, ${bracket.label}`}>
      <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
        {/* Track */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={colors.border.subtle}
          strokeWidth={STROKE_WIDTH}
        />
        {/* Progress arc — starts at 12 o'clock (rotate -90 about centre). */}
        <AnimatedCircle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={bracket.color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={filledOffset}
          origin={`${CENTER}, ${CENTER}`}
          rotation={-90}
          animatedProps={animatedProps}
        />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.score} allowFontScaling={false}>
          {displayScore}
        </Text>
        <Text style={[styles.label, { color: bracket.color }]}>
          {bracket.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontFamily: typography.data.fontFamily,
    fontSize: 50,
    fontWeight: '700',
    letterSpacing: -2,
    lineHeight: 50,
    color: colors.text.primary,
  },
  label: {
    ...typography.overline,
    fontSize: 11,
    letterSpacing: 1.3,
    marginTop: 7,
  },
});
