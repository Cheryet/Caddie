/**
 * Toast — UI primitive
 * Imperative singleton API for transient bottom-anchored messages. Use
 * this instead of `Alert.alert` (a project-wide non-negotiable per
 * CLAUDE.md). The shape is deliberately tiny so call sites are one line:
 *
 *   import { Toast } from '@/components/ui';
 *   Toast.show({ message: 'Swing uploaded', variant: 'success' });
 *
 * `<ToastHost />` is mounted once at app root (App.tsx). It subscribes
 * to the singleton's event stream and renders the active toast with a
 * slide-in/out animation. Only one toast is visible at a time; calling
 * `show()` while another is on-screen replaces it.
 *
 * The singleton lives outside React so it can be called from anywhere —
 * async handlers, error catches, even non-component modules.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors, layout, spacing, typography } from '@/theme';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastPayload {
  message: string;
  variant?: ToastVariant;
  /** Override the default visible duration (3000ms). */
  durationMs?: number;
}

interface ToastState extends ToastPayload {
  /** Monotonically incrementing token so the host can react to repeat
   *  identical-message calls. */
  token: number;
}

type Listener = (state: ToastState | null) => void;

const DEFAULT_DURATION_MS = 3000;

// Module-level state — single source of truth for the active toast.
// Lives outside React so non-component callers can trigger it too.
let token = 0;
let currentState: ToastState | null = null;
const listeners = new Set<Listener>();

function emit(state: ToastState | null): void {
  currentState = state;
  listeners.forEach(l => l(state));
}

export const Toast = {
  show(payload: ToastPayload): void {
    token += 1;
    emit({ ...payload, token });
  },
  hide(): void {
    emit(null);
  },
};

// ───── Host ─────────────────────────────────────────────────────────────
// Mounted in App.tsx. Subscribes to the singleton above and renders the
// active toast. Drives the slide-in / auto-dismiss / slide-out animation.

const ENTER_DURATION_MS = 220;
const EXIT_DURATION_MS = 180;

export function ToastHost(): React.ReactElement | null {
  const [state, setState] = useState<ToastState | null>(currentState);
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const listener: Listener = next => setState(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!state) {
      opacity.value = withTiming(0, { duration: EXIT_DURATION_MS });
      translateY.value = withTiming(40, { duration: EXIT_DURATION_MS });
      return;
    }
    const duration = state.durationMs ?? DEFAULT_DURATION_MS;
    translateY.value = 40;
    opacity.value = 0;
    translateY.value = withTiming(0, {
      duration: ENTER_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(1, { duration: ENTER_DURATION_MS });
    // Schedule auto-dismiss. Delay matches `duration`; on completion we
    // emit null which triggers the !state branch above for the exit
    // animation.
    opacity.value = withDelay(
      duration,
      withTiming(0, { duration: EXIT_DURATION_MS }, finished => {
        if (finished) runOnJS(autoDismiss)(state.token);
      }),
    );
  }, [state, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!state) return null;

  const variantStyle = VARIANT_STYLES[state.variant ?? 'info'];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { bottom: insets.bottom + spacing[6] },
        animatedStyle,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      <View
        style={[
          styles.card,
          { backgroundColor: variantStyle.bg, borderColor: variantStyle.border },
        ]}>
        <Text style={[styles.message, { color: variantStyle.text }]}>
          {state.message}
        </Text>
      </View>
    </Animated.View>
  );
}

// Only dismiss if the token still matches — otherwise a newer toast has
// replaced this one and is mid-animation; don't clobber it.
function autoDismiss(forToken: number): void {
  if (currentState?.token === forToken) {
    emit(null);
  }
}

interface VariantPalette {
  bg: string;
  text: string;
  border: string;
}

const VARIANT_STYLES: Record<ToastVariant, VariantPalette> = {
  success: { bg: '#1A3D2B', text: '#A8E0B8', border: '#2D6644' },
  error: { bg: '#3D1515', text: '#F0A8A8', border: '#6B2525' },
  info: {
    bg: colors.bg.overlay,
    text: colors.text.primary,
    border: colors.border.default,
  },
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    alignItems: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: layout.borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    maxWidth: 480,
    alignSelf: 'stretch',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
});
