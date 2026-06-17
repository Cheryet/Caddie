/**
 * AnalysisLoading — Feature component
 * The full-screen "Analysing your swing" state shown while the Claude call
 * runs (DESIGN_SYSTEM §11 AI analysis loading; Design/Caddie Screens.dc.html
 * §03 "analysing"). A pulsing gold sparkle inside a spinning ring, a live
 * elapsed-time counter, and the staged pipeline progress.
 *
 * Self-contained: owns its elapsed timer and animations. Animations respect
 * reduce-motion. The expected wait is 5–15s so the user gets continuous
 * feedback. `onClose` cancels (wired by the screen in Phase 4.4).
 *
 * 4.3 note: the design tucks a darkened swing still behind this; with mock
 * data there's no frame, so the background is solid (bg.base). The staged
 * rows are presentational here — Phase 4.4 can drive them from real pipeline
 * state.
 *
 * Part of: src/features/analysis/
 */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  CheckIcon,
  CloseIcon,
  SparkleIcon,
} from '@/features/analysis/components/AnalysisIcons';
import { colors, layout, spacing, typography } from '@/theme';

const SPIN_MS = 1100;
const PULSE_MS = 900;

interface Stage {
  label: string;
  status: 'done' | 'active';
}

// The real Phase 4.4 pipeline: extract frames → detect pose → call Claude.
// Presentational ordering here; the last stage is the one in flight.
const STAGES: readonly Stage[] = [
  { label: 'Frames extracted', status: 'done' },
  { label: 'Pose detected', status: 'done' },
  { label: 'Generating coaching notes', status: 'active' },
];

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

interface AnalysisLoadingProps {
  onClose?: () => void;
}

export function AnalysisLoading({ onClose }: AnalysisLoadingProps) {
  const insets = useSafeAreaInsets();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing[2] }]}>
      <View style={styles.header}>
        {onClose ? (
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel analysis"
            style={styles.closeButton}>
            <CloseIcon color={colors.text.primary} size={20} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.center}>
        <SparkleMark />
        <Text style={styles.title}>Analysing your swing</Text>
        <Text style={styles.subtitle}>
          Reading your tempo, plane and impact frame by frame. This usually
          takes a few seconds.
        </Text>
        <View style={styles.elapsedPill}>
          <View style={styles.elapsedDot} />
          <Text style={styles.elapsedText}>{formatElapsed(elapsed)} elapsed</Text>
        </View>
      </View>

      <View style={[styles.stages, { paddingBottom: insets.bottom + spacing[6] }]}>
        {STAGES.map(stage => (
          <View key={stage.label} style={styles.stageRow}>
            {stage.status === 'done' ? (
              <CheckIcon color={colors.semantic.success} size={18} />
            ) : (
              <RingSpinner size={18} borderWidth={2} />
            )}
            <Text
              style={[
                styles.stageLabel,
                stage.status === 'active' && styles.stageLabelActive,
              ]}>
              {stage.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ───── Sparkle mark — spinning ring + pulsing gold tile ────────────────────

function SparkleMark() {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + pulse.value * 0.4,
    transform: [{ scale: 0.92 + pulse.value * 0.16 }],
  }));

  return (
    <View style={styles.markWrap}>
      <RingSpinner size={96} borderWidth={1.5} />
      <Animated.View style={[styles.markTile, pulseStyle]}>
        <SparkleIcon color={colors.gold.default} size={32} />
      </Animated.View>
    </View>
  );
}

// ───── Rotating ring (RN border trick — no SVG) ────────────────────────────

interface RingSpinnerProps {
  size: number;
  borderWidth: number;
}

function RingSpinner({ size, borderWidth }: RingSpinnerProps) {
  const reduceMotion = useReducedMotion();
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    rotation.value = withRepeat(
      withTiming(360, { duration: SPIN_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation, reduceMotion]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View
      accessibilityRole="none"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: colors.gold.dim,
          borderTopColor: colors.gold.default,
        },
        spinStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
    paddingHorizontal: spacing[6],
  },
  header: {
    height: 48,
    justifyContent: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    marginLeft: -spacing[2],
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markTile: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: layout.borderRadius.xl,
    backgroundColor: colors.gold.dim,
    borderWidth: 1,
    borderColor: colors.gold.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.text.primary,
    marginTop: spacing[6] + 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: spacing[2] + 1,
  },
  elapsedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 32,
    paddingHorizontal: spacing[4] - 2,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginTop: spacing[5] - 2,
  },
  elapsedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold.default,
  },
  elapsedText: {
    ...typography.dataSmall,
    fontSize: 13,
    color: colors.text.secondary,
  },
  stages: {
    gap: spacing[3] - 1,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3] - 1,
  },
  stageLabel: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.secondary,
  },
  stageLabelActive: {
    color: colors.text.primary,
    fontWeight: '600',
  },
});
