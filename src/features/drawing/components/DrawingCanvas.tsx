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

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Svg from 'react-native-svg';

import { ShapeView } from '@/features/drawing/components/Shapes';
import type {
  CanvasSize,
  DrawingState,
  Point,
  Shape,
  ShapeId,
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
  /** Id of the selected shape (Select tool). */
  selectedShapeId?: ShapeId | null;
  onStrokeStart: (point: Point) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: () => void;
  /**
   * Tap on the canvas. Return `true` to absorb the tap (e.g. the
   * Angle tool placed a point, or the Select tool selected/cleared
   * a shape); `false` to let the parent fall through to the
   * chrome-toggle behaviour. Receives the tap location in canvas-
   * local pixels.
   */
  onCanvasTap?: (point: Point) => boolean;
  /** Called by the parent when our consume-tap returned false. */
  onTap?: () => void;
  /** Driven by onLayout — needed for PlaneShape edge extension. */
  onSize?: (size: CanvasSize) => void;
}

const PAN_ACTIVATION_THRESHOLD_PX = 5;

export function DrawingCanvas({
  enabled,
  tool,
  shapes = [],
  inProgress = null,
  selectedShapeId = null,
  onStrokeStart,
  onStrokeMove,
  onStrokeEnd,
  onCanvasTap,
  onTap,
  onSize,
}: DrawingCanvasProps) {
  // Show endpoint handles on committed lines when the Line tool is
  // active — affordance for the endpoint-drag behaviour.
  const showLineEndpoints = tool === 'line';
  // Track canvas dimensions for the PlaneShape renderer.
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 });
  // Bridges the gesture's tap event to the consume-or-toggle chain:
  // first ask the tool (Angle places points, Select hit-tests, others
  // pass), then fall back to the parent's onTap (chrome toggle).
  const handleTap = (point: Point) => {
    if (onCanvasTap && onCanvasTap(point)) return;
    onTap?.();
  };

  // `.runOnJS(true)` keeps gesture callbacks on the JS thread, which
  // sidesteps Reanimated's worklet-runtime serialization of our
  // closures. Without it, RNGH 3 routes gesture events through
  // Reanimated's UIEventHandler — and any closure that captures
  // unstable React-prop references can crash inside
  // `JSIWorkletsModuleProxy::toOptimizedObject` (see Phase 2.3 fix).
  // Our callbacks were already JS-only (all wrapped in runOnJS), so
  // this is the simpler, equivalent path.
  const tap = Gesture.Tap()
    .runOnJS(true)
    .enabled(enabled)
    .maxDistance(PAN_ACTIVATION_THRESHOLD_PX)
    .onEnd((e, success) => {
      if (!success) return;
      handleTap({ x: e.x, y: e.y });
    });

  const pan = Gesture.Pan()
    .runOnJS(true)
    .enabled(enabled)
    .activeOffsetX([-PAN_ACTIVATION_THRESHOLD_PX, PAN_ACTIVATION_THRESHOLD_PX])
    .activeOffsetY([-PAN_ACTIVATION_THRESHOLD_PX, PAN_ACTIVATION_THRESHOLD_PX])
    // onStart fires once Pan crosses the activation threshold. Using
    // it instead of onBegin means a quick tap (which never activates
    // Pan) doesn't emit a stroke-start.
    .onStart(e => {
      onStrokeStart({ x: e.x, y: e.y });
    })
    .onUpdate(e => {
      onStrokeMove({ x: e.x, y: e.y });
    })
    .onEnd(() => {
      onStrokeEnd();
    });

  const gesture = Gesture.Race(pan, tap);

  return (
    <View
      style={styles.root}
      pointerEvents={enabled ? 'auto' : 'none'}
      accessibilityLabel={enabled ? 'Drawing canvas' : undefined}
      onLayout={e => {
        const next = {
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        };
        setSize(next);
        onSize?.(next);
      }}
    >
      <GestureDetector gesture={gesture}>
        <Svg width="100%" height="100%">
          {shapes.map(shape => (
            <ShapeView
              key={shape.id}
              shape={shape}
              showLineEndpoints={showLineEndpoints}
              selected={shape.id === selectedShapeId}
              canvasSize={size}
            />
          ))}
          {inProgress ? (
            <ShapeView
              shape={inProgress}
              showLineEndpoints={false}
              canvasSize={size}
            />
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
