/**
 * DrawingCanvas — Feature component
 * Absolute-positioned SVG layer that sits between the VideoPlayer and
 * the PlaybackChrome. Captures touch events via
 * react-native-gesture-handler's Gesture.Pan and reports start /
 * move / end as `Point`s in the canvas's local pixel space.
 *
 * Phase 2.1 is foundation only:
 *   - When `enabled` is false the layer mounts with
 *     `pointerEvents="none"`, so taps fall through to the player's
 *     tap-to-toggle-chrome Pressable below.
 *   - When `enabled` is true the GestureDetector intercepts pan
 *     gestures; the SVG body is intentionally empty (visible shapes
 *     land in Phase 2.2's tools).
 *
 * Coordinates are RAW pixel values from the gesture event — the
 * canvas's container is `StyleSheet.absoluteFill` over the video,
 * so they're already aligned with the visible video frame for the
 * purposes of stroke capture. Phase 2.4 will normalize before
 * persisting (so saved drawings replay on any device width).
 */

import { StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Svg from 'react-native-svg';
import { runOnJS } from 'react-native-reanimated';

import type { Point } from '@/features/drawing/types';

interface DrawingCanvasProps {
  /** When false, the canvas is transparent to touches. */
  enabled: boolean;
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: () => void;
}

export function DrawingCanvas({
  enabled,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
}: DrawingCanvasProps) {
  // RNGH gesture handlers run on the UI thread. `runOnJS` is the
  // bridge for calling our JS callbacks; without it the handler would
  // throw "Tried to synchronously call function from a different
  // thread". The callbacks themselves are plain JS — Reanimated only
  // provides the bridge function.
  const pan = Gesture.Pan()
    .enabled(enabled)
    // Begin fires on the first finger-down; matches "stroke start".
    .onBegin(e => {
      runOnJS(onStrokeStart)({ x: e.x, y: e.y });
    })
    .onUpdate(e => {
      runOnJS(onStrokeMove)({ x: e.x, y: e.y });
    })
    // End covers both natural lift and gesture cancellation; for
    // Phase 2.1 we collapse them so isStroking always clears.
    .onFinalize(() => {
      runOnJS(onStrokeEnd)();
    });

  return (
    <View
      style={styles.root}
      pointerEvents={enabled ? 'auto' : 'none'}
      accessibilityLabel={enabled ? 'Drawing canvas' : undefined}
    >
      <GestureDetector gesture={pan}>
        <Svg width="100%" height="100%">
          {/* Phase 2.2+ shapes render here. */}
        </Svg>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
