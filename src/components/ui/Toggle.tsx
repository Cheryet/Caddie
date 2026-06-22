/**
 * Toggle — UI primitive
 * The pill switch from Design §06 (46×28 track, 22px knob): gold track when
 * on, neutral when off, white knob that slides with a 150ms Reanimated
 * timing (respects reduce-motion). Used for the ProfileScreen preference /
 * notification rows; the first shared switch in the design system.
 *
 * Controlled: pass `value` + `onValueChange`. No data fetching, theme
 * tokens only.
 */

import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  /** Accessibility label — required since the switch has no visible text. */
  accessibilityLabel: string;
}

const TRACK_WIDTH = 46;
const TRACK_HEIGHT = 28;
const KNOB = 22;
const PADDING = 3;
const OFF_X = PADDING;
const ON_X = TRACK_WIDTH - KNOB - PADDING; // 21
const DURATION_MS = 150;

export function Toggle({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: ToggleProps) {
  const reduceMotion = useReducedMotion();

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(value ? ON_X : OFF_X, {
          duration: reduceMotion ? 0 : DURATION_MS,
        }),
      },
    ],
  }));

  const trackColor = value ? colors.gold.default : colors.bg.input;
  const borderColor = value ? colors.gold.default : colors.border.default;

  return (
    <Pressable
      onPress={disabled ? undefined : () => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.track,
        { backgroundColor: trackColor, borderColor },
        disabled && styles.disabled,
      ]}>
      <Animated.View style={[styles.knob, knobStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    top: PADDING,
    left: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.text.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  disabled: {
    opacity: 0.4,
  },
});
