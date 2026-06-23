/**
 * TrimBar — Feature component
 * Bottom overlay panel for selecting a [start,end] range on a clip. A
 * thumbnail filmstrip with two draggable handles; the area outside the
 * selection is dimmed and the selection is framed in gold. Dragging a
 * handle seeks the player live (`onSeekMs`) so the user sees the edge
 * frame. Pure range selection — the re-encode happens later, on Save
 * (see useTrim.materialize).
 *
 * Built entirely from design tokens. Handles use gesture-handler's
 * Gesture.Pan with `.runOnJS(true)` (same pattern as DrawingCanvas) so
 * the math stays on the JS thread — two handles is well within budget.
 */

import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { colors, layout, spacing, typography } from '@/theme';

import type { ThumbsStatus, TrimRange } from '../hooks/useTrim';

interface TrimBarProps {
  durationMs: number;
  thumbnails: string[];
  thumbsStatus: ThumbsStatus;
  initialRange: TrimRange | null;
  minDurationMs: number;
  /** Live-preview seek as a handle drags. */
  onSeekMs: (ms: number) => void;
  onCancel: () => void;
  onApply: (startMs: number, endMs: number) => void;
}

const HANDLE_HIT = 44; // ≥44pt touch target
const TRACK_HEIGHT = 56;

function formatClock(ms: number): string {
  const totalSec = Math.max(0, ms) / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSpan(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}

export function TrimBar({
  durationMs,
  thumbnails,
  thumbsStatus,
  initialRange,
  minDurationMs,
  onSeekMs,
  onCancel,
  onApply,
}: TrimBarProps) {
  const insets = useSafeAreaInsets();
  const [trackWidth, setTrackWidth] = useState(0);
  const [startMs, setStartMs] = useState(initialRange?.startMs ?? 0);
  const [endMs, setEndMs] = useState(initialRange?.endMs ?? durationMs);

  // Handle position (in ms) captured at gesture start so onUpdate can add
  // the pan translation without drift.
  const startAtBeginRef = useRef(0);
  const endAtBeginRef = useRef(0);

  const msPerPx = trackWidth > 0 ? durationMs / trackWidth : 0;
  const pxPerMs = durationMs > 0 ? trackWidth / durationMs : 0;
  const startX = startMs * pxPerMs;
  const endX = endMs * pxPerMs;

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  }, []);

  const leftPan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      startAtBeginRef.current = startMs;
    })
    .onUpdate(e => {
      if (msPerPx <= 0) return;
      const next = startAtBeginRef.current + e.translationX * msPerPx;
      const clamped = Math.max(0, Math.min(next, endMs - minDurationMs));
      setStartMs(clamped);
      onSeekMs(clamped);
    });

  const rightPan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      endAtBeginRef.current = endMs;
    })
    .onUpdate(e => {
      if (msPerPx <= 0) return;
      const next = endAtBeginRef.current + e.translationX * msPerPx;
      const clamped = Math.min(durationMs, Math.max(next, startMs + minDurationMs));
      setEndMs(clamped);
      onSeekMs(clamped);
    });

  const selectionTooShort = endMs - startMs < minDurationMs;
  const ready = trackWidth > 0 && durationMs > 0;

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + spacing[3] }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Trim swing</Text>
        <Text style={styles.span}>{formatSpan(endMs - startMs)}</Text>
      </View>

      <View style={styles.track} onLayout={onTrackLayout}>
        <View style={styles.filmstrip} pointerEvents="none">
          {thumbsStatus === 'ready' && thumbnails.length > 0
            ? thumbnails.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={styles.thumb}
                  resizeMode="cover"
                />
              ))
            : null}
          {thumbsStatus === 'loading' ? (
            <View style={styles.thumbFallback}>
              <ActivityIndicator size="small" color={colors.gold.default} />
            </View>
          ) : null}
        </View>

        {ready ? (
          <>
            <View
              style={[styles.mask, styles.maskStart, { width: startX }]}
              pointerEvents="none"
            />
            <View
              style={[styles.mask, { left: endX, width: Math.max(0, trackWidth - endX) }]}
              pointerEvents="none"
            />
            <View
              style={[
                styles.selection,
                { left: startX, width: Math.max(0, endX - startX) },
              ]}
              pointerEvents="none"
            />
            <GestureDetector gesture={leftPan}>
              <View style={[styles.handleHit, { left: startX - HANDLE_HIT / 2 }]}>
                <View style={styles.handle}>
                  <View style={styles.grip} />
                </View>
              </View>
            </GestureDetector>
            <GestureDetector gesture={rightPan}>
              <View style={[styles.handleHit, { left: endX - HANDLE_HIT / 2 }]}>
                <View style={styles.handle}>
                  <View style={styles.grip} />
                </View>
              </View>
            </GestureDetector>
          </>
        ) : null}
      </View>

      <View style={styles.times}>
        <Text style={styles.time}>{formatClock(startMs)}</Text>
        <Text style={styles.time}>{formatClock(endMs)}</Text>
      </View>

      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <Button
            label="Cancel"
            onPress={onCancel}
            variant="secondary"
            fullWidth
          />
        </View>
        <View style={styles.actionItem}>
          <Button
            label="Apply"
            onPress={() => onApply(startMs, endMs)}
            variant="primary"
            disabled={selectionTooShort}
            fullWidth
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: layout.borderRadius.lg,
    borderTopRightRadius: layout.borderRadius.lg,
    borderTopWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  span: {
    ...typography.bodyStrong,
    color: colors.gold.text,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: layout.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.always.black,
  },
  filmstrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  thumb: {
    flex: 1,
    height: '100%',
  },
  thumbFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mask: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  maskStart: {
    left: 0,
  },
  selection: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: colors.gold.default,
    borderRadius: layout.borderRadius.sm,
  },
  handleHit: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 12,
    height: '100%',
    backgroundColor: colors.gold.default,
    borderRadius: layout.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grip: {
    width: 2,
    height: 18,
    borderRadius: 1,
    backgroundColor: colors.always.black,
    opacity: 0.5,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    ...typography.dataSmall,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  actionItem: {
    flex: 1,
  },
});
