/**
 * BottomSheet — UI primitive
 * Modal-backed bottom-anchored sheet for transient flows that need more
 * surface area than a Toast (DESIGN_SYSTEM.md §13 — "Sheets over
 * Alerts"). Use this instead of `Alert.alert` for anything richer than
 * a yes/no, and instead of pushing a new screen for confirm-style flows.
 *
 * Usage:
 *   <BottomSheet visible={open} onDismiss={() => setOpen(false)}>
 *     {...content}
 *   </BottomSheet>
 *
 * Behavior:
 *   - tapping the dimmed backdrop dismisses (controlled via onDismiss)
 *   - swipe-to-dismiss is intentionally not in this primitive; consumers
 *     that need it can add a gesture handler — keeping the v1 surface
 *     small means we don't pull in extra dependencies
 *   - content height drives the sheet height; max ~85% of screen
 *   - safe-area bottom inset is added automatically so callers don't
 *     need to wire it themselves
 */

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, layout, spacing } from '@/theme';

interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  /** Accessible label announced when the sheet opens. */
  accessibilityLabel?: string;
  children: ReactNode;
}

const ENTER_DURATION_MS = 260;
const EXIT_DURATION_MS = 200;
const BACKDROP_OPACITY = 0.65;

export function BottomSheet({
  visible,
  onDismiss,
  accessibilityLabel,
  children,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(40);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: ENTER_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(BACKDROP_OPACITY, {
        duration: ENTER_DURATION_MS,
      });
    } else {
      translateY.value = withTiming(40, { duration: EXIT_DURATION_MS });
      backdropOpacity.value = withTiming(0, { duration: EXIT_DURATION_MS });
    }
  }, [visible, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, backdropStyle]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            accessibilityLabel="Dismiss sheet"
            accessibilityRole="button"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing[4] },
            sheetStyle,
          ]}
          accessibilityRole="none"
          accessibilityLabel={accessibilityLabel}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.always.black,
  },
  sheet: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: layout.borderRadius.xl,
    borderTopRightRadius: layout.borderRadius.xl,
    paddingTop: spacing[2],
    paddingHorizontal: spacing[4],
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.strong,
    marginBottom: spacing[3],
  },
});
