/**
 * PulseRing — Feature component (Reanimated)
 * The expanding beat rings inside the metronome dial (PROJECT_SPEC §22 Phase
 * 5.3; Design §07 keyframe `cad-tempo-ring`, L17). Three gold rings each loop
 * scale 0.66→1.34 / opacity 0.75→0 over one beat, staggered by a third of a
 * beat so a new ring leaves the centre as the previous fades.
 *
 * Rendered only while playing (the rings mount on play, unmount on stop, so
 * each run starts cleanly from the centre). Respects reduce-motion. Mirrors
 * the Reanimated loop pattern in analysis/components/AnalysisLoading.tsx.
 *
 * Part of: src/features/tempo/
 */

import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const RING_COUNT = 3;
const RING_KEYS = ['ring-0', 'ring-1', 'ring-2'];

interface PulseRingProps {
  playing: boolean;
  beatDurationMs: number;
}

export function PulseRing({ playing, beatDurationMs }: PulseRingProps) {
  if (!playing) return null;
  return (
    <>
      {RING_KEYS.map((key, i) => (
        <Ring key={key} index={i} beatDurationMs={beatDurationMs} />
      ))}
    </>
  );
}

interface RingProps {
  index: number;
  beatDurationMs: number;
}

function Ring({ index, beatDurationMs }: RingProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    if (reduceMotion) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      (index * beatDurationMs) / RING_COUNT,
      withRepeat(
        withTiming(1, { duration: beatDurationMs, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [progress, index, beatDurationMs, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.66, 1.34]) }],
    opacity: interpolate(progress.value, [0, 0.7, 1], [0.75, 0.1, 0]),
  }));

  return <Animated.View style={[styles.ring, animatedStyle]} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 2,
    // Gold at alpha (design value); literal per the PlaybackChrome precedent.
    borderColor: 'rgba(201,168,76,0.55)',
  },
});
