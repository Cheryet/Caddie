/**
 * OfflineBanner — App-level component
 * Full-width banner under the status bar shown when the device is offline
 * (PROJECT_SPEC §7). Hosted once in App.tsx as a sibling of RootNavigator;
 * always mounted (opacity 0 + non-interactive when online) so it can animate
 * both in and out. Reduce-motion-aware.
 */

import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useNetworkStatus } from '@/components/useNetworkStatus';
import { colors, spacing } from '@/theme';

const ANIM_MS = 220;

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isOffline ? 1 : 0, {
      duration: reduceMotion ? 0 : ANIM_MS,
    });
  }, [isOffline, reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -8 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={isOffline ? "You're offline" : undefined}
      style={[
        styles.bar,
        { paddingTop: insets.top + spacing[1] },
        animatedStyle,
      ]}>
      <Text style={styles.text}>You're offline</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
    paddingBottom: spacing[2],
    backgroundColor: colors.semantic.warning,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.text.inverse,
  },
});
