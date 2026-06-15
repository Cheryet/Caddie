/**
 * Skeleton — UI primitive
 * Loading placeholder with a shimmering opacity animation. Use this for
 * list/grid loading states instead of a spinner (DESIGN_SYSTEM.md §11).
 *
 * Visual: rect of given width/height/borderRadius, opacity loops
 * 0.4 → 0.8 → 0.4 over 1.2s. Colors interpolate between border.subtle
 * and border.default so the rect feels like it's "breathing" against
 * the surrounding card.
 *
 * The animation runs on the UI thread via Reanimated worklets; no JS
 * frame budget is consumed once mounted.
 */

import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
}

const SHIMMER_DURATION_MS = 1200;
const MIN_OPACITY = 0.4;
const MAX_OPACITY = 0.8;

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 6,
}: SkeletonProps) {
  const opacity = useSharedValue(MIN_OPACITY);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(MAX_OPACITY, {
        duration: SHIMMER_DURATION_MS / 2,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius },
        animatedStyle,
      ]}
      accessibilityRole="none"
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border.default,
  },
});
