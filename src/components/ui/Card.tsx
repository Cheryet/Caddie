/**
 * Card — UI primitive
 * Surface for grouped content. Two depth variants:
 *   default — `bg.elevated`, 1px `border.subtle`
 *   raised  — `bg.overlay`,  1px `border.default`, subtle iOS shadow
 *
 * Tappable when `onPress` is supplied — adds a Reanimated scale-0.99
 * press feedback per DESIGN_SYSTEM.md §5. Otherwise renders as a static
 * View with no press behavior at all.
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, layout } from '@/theme';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'raised';
  /** Override inner padding. Defaults to `layout.cardPadding`. */
  padding?: number;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  children,
  variant = 'default',
  padding = layout.cardPadding,
  onPress,
}: CardProps) {
  const surfaceStyle = variant === 'raised' ? styles.raised : styles.default;
  const innerPadding = { padding };

  if (!onPress) {
    return <View style={[styles.card, surfaceStyle, innerPadding]}>{children}</View>;
  }

  return <PressableCard surfaceStyle={surfaceStyle} innerPadding={innerPadding} onPress={onPress}>{children}</PressableCard>;
}

interface PressableCardProps {
  surfaceStyle: object;
  innerPadding: { padding: number };
  onPress: () => void;
  children: ReactNode;
}

function PressableCard({
  surfaceStyle,
  innerPadding,
  onPress,
  children,
}: PressableCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.99, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      accessibilityRole="button"
      style={[styles.card, surfaceStyle, innerPadding, animatedStyle]}>
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: layout.borderRadius.lg,
    borderWidth: 1,
  },
  default: {
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border.subtle,
  },
  raised: {
    backgroundColor: colors.bg.overlay,
    borderColor: colors.border.default,
    // Subtle iOS shadow — on dark backgrounds we lean on contrast more
    // than depth; opacity stays well under 0.5.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});
