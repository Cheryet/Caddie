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

import { ShapeView } from '@/features/drawing/components/Shapes';
import type {
  DrawingState,
  Point,
  Shape,
  Tool,
} from '@/features/drawing/types';

interface DrawingCanvasProps {
  /** When false, the canvas is transparent to touches. */
  enabled: boolean;
  /** Currently-selected tool; controls whether endpoint handles render. */
  tool?: Tool;
  /** Committed shapes from useDrawing. */
  shapes?: DrawingState;
  /** The stroke currently being drawn, if any. */
  inProgress?: Shape | null;
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: () => void;
  /**
   * Fired on a quick tap (no significant movement). When `enabled` is
   * true the canvas captures all touches, so this is the hook the
   * parent uses to keep the player's tap-to-toggle-chrome behaviour
   * working in drawing mode. Pan with a movement threshold takes
   * precedence over Tap when the user actually drags.
   */
  onTap?: () => void;
}

const PAN_ACTIVATION_THRESHOLD_PX = 5;

export function DrawingCanvas({
  enabled,
  tool,
  shapes = [],
  inProgress = null,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  onTap,
}: DrawingCanvasProps) {
  // Show endpoint handles on committed lines when the Line tool is
  // active — affordance for the endpoint-drag behaviour.
  const showLineEndpoints = tool === 'line';
  // RNGH gesture handlers run on the UI thread. `runOnJS` is the
  // bridge for calling our JS callbacks; without it the handler would
  // throw "Tried to synchronously call function from a different
  // thread". The callbacks themselves are plain JS — Reanimated only
  // provides the bridge function.
  //
  // Compose Tap + Pan so a quick tap (without movement) toggles the
  // chrome via `onTap`, while a drag past PAN_ACTIVATION_THRESHOLD_PX
  // starts a stroke. Without the threshold every tap would register
  // as a degenerate stroke and the user could never reach the player
  // tap-to-toggle behaviour through an active drawing tool.
  const tap = Gesture.Tap()
    .enabled(enabled)
    .maxDistance(PAN_ACTIVATION_THRESHOLD_PX)
    .onEnd((_e, success) => {
      if (!success) return;
      if (onTap) runOnJS(onTap)();
    });

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-PAN_ACTIVATION_THRESHOLD_PX, PAN_ACTIVATION_THRESHOLD_PX])
    .activeOffsetY([-PAN_ACTIVATION_THRESHOLD_PX, PAN_ACTIVATION_THRESHOLD_PX])
    // onStart fires once Pan crosses the activation threshold. Using
    // it instead of onBegin means a quick tap (which never activates
    // Pan) doesn't emit a stroke-start.
    .onStart(e => {
      runOnJS(onStrokeStart)({ x: e.x, y: e.y });
    })
    .onUpdate(e => {
      runOnJS(onStrokeMove)({ x: e.x, y: e.y });
    })
    .onEnd(() => {
      runOnJS(onStrokeEnd)();
    });

  const gesture = Gesture.Race(pan, tap);

  return (
    <View
      style={styles.root}
      pointerEvents={enabled ? 'auto' : 'none'}
      accessibilityLabel={enabled ? 'Drawing canvas' : undefined}
    >
      <GestureDetector gesture={gesture}>
        <Svg width="100%" height="100%">
          {shapes.map(shape => (
            <ShapeView
              key={shape.id}
              shape={shape}
              showLineEndpoints={showLineEndpoints}
            />
          ))}
          {inProgress ? (
            <ShapeView shape={inProgress} showLineEndpoints={false} />
          ) : null}
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
