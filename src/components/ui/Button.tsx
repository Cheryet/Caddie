/**
 * Button — UI primitive
 * The ONLY way to render a primary action in the app. Three variants per
 * DESIGN_SYSTEM.md §5:
 *   primary   — gold fill, black text. One per screen maximum.
 *   secondary — dark fill, gold border (1px), gold text.
 *   ghost     — no fill, no border, secondary text. Use for destructive.
 *
 * Sizes sm/md/lg map to fixed heights from the design system. Loading
 * replaces the label with a spinner without changing dimensions.
 *
 * Press animation: scale 0.97 spring via Reanimated, 150ms, per spec.
 */

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, layout, spacing, typography } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rendered to the LEFT of the label. */
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /**
   * When true and `variant="primary"`, applies the gold-glow drop shadow
   * called for by the empty-state hero CTAs in Caddie Screens.dc.html
   * (e.g. LibraryScreen empty, OnboardingScreen). Off by default — most
   * primary buttons sit on a surface where the shadow would feel heavy.
   */
  shadow?: boolean;
}

interface SizeSpec {
  height: number;
  paddingH: number;
  fontSize: number;
  borderRadius: number;
}

const SIZES: Record<ButtonSize, SizeSpec> = {
  sm: { height: 36, paddingH: 14, fontSize: 13, borderRadius: layout.borderRadius.md },
  md: { height: 48, paddingH: 20, fontSize: 15, borderRadius: layout.borderRadius.md },
  // Primary hero CTAs use the larger 14px radius + 52px height per the
  // design system (Caddie Auth.dc.html, Caddie Screens.dc.html §04 empty).
  lg: { height: 52, paddingH: 24, fontSize: 16, borderRadius: layout.borderRadius.lg },
};

// Gold-glow drop shadow for hero CTAs. Native shadow tokens are split:
// iOS reads shadowColor/Offset/Opacity/Radius; Android reads `elevation`.
// We provide both so the same prop works cross-platform.
const GOLD_GLOW_SHADOW = {
  shadowColor: colors.gold.default,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.6,
  shadowRadius: 14,
  elevation: 8,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  shadow = false,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const sizeSpec = SIZES[size];
  const variantStyle = VARIANT_STYLES[variant];
  const isInactive = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Pressable's `disabled` prop blocks event delivery at the native
  // layer; the inner guard is defence in depth so testing-library style
  // synthetic events also short-circuit.
  const handlePress = () => {
    if (isInactive) return;
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={isInactive}
      onPressIn={() => {
        if (isInactive) return;
        scale.value = withTiming(0.97, { duration: 150 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 150 });
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={[
        styles.button,
        variantStyle.container,
        {
          height: sizeSpec.height,
          paddingHorizontal: sizeSpec.paddingH,
          borderRadius: sizeSpec.borderRadius,
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        shadow && variant === 'primary' && !disabled && GOLD_GLOW_SHADOW,
        animatedStyle,
      ]}>
      {loading ? (
        <ActivityIndicator color={variantStyle.spinner} />
      ) : (
        <View style={styles.inner}>
          {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
          <Text
            style={[
              styles.label,
              {
                color: variantStyle.label,
                fontSize: sizeSpec.fontSize,
              },
            ]}
            numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

interface VariantStyle {
  container: object;
  label: string;
  spinner: string;
}

const VARIANT_STYLES: Record<ButtonVariant, VariantStyle> = {
  primary: {
    container: {
      backgroundColor: colors.gold.default,
      borderWidth: 0,
    },
    label: colors.text.inverse,
    spinner: colors.text.inverse,
  },
  secondary: {
    container: {
      backgroundColor: colors.bg.overlay,
      borderWidth: 1,
      borderColor: colors.gold.default,
    },
    label: colors.gold.text,
    spinner: colors.gold.default,
  },
  ghost: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    label: colors.text.secondary,
    spinner: colors.text.secondary,
  },
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    marginRight: spacing[2],
  },
  label: {
    ...typography.bodyStrong,
  },
});
