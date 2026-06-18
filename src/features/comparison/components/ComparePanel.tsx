/**
 * ComparePanel — Feature component
 * One side of the comparison. Renders the empty "pick a swing" slot, a
 * loading/error state, or the live panel: the video with a tap-to-play
 * surface, a top-left "Club · date" label (tap to change), a top-right
 * control cluster (pose toggle + mark-impact), the pose skeleton overlay,
 * and a bottom scrim with a scrub slider (amber impact tick) + 0.5×/1×
 * speed toggle. Layout per Design/Caddie Screens.dc.html §05 (portrait panel).
 *
 * Purely presentational — all state + handlers come from a ComparePanelState
 * (useComparePanel) via props.
 *
 * Part of: src/features/comparison/
 */

import type { Ref } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { VideoPlayer } from '@/features/playback/components/VideoPlayer';
import type { VideoPlayerHandle } from '@/features/playback/components/VideoPlayer';
import { PoseOverlay } from '@/features/pose/components/PoseOverlay';
import {
  COMPARE_RATES,
  type ComparePanelState,
} from '@/features/comparison/types';
import { colors, layout, spacing, typography } from '@/theme';

interface ComparePanelProps {
  panel: ComparePanelState;
  playerRef: Ref<VideoPlayerHandle>;
  /** Open the picker to choose / change this slot's video. */
  onPick: () => void;
  /** Shown on the empty slot, e.g. "Swing A". */
  placeholder: string;
}

export function ComparePanel({ panel, playerRef, onPick, placeholder }: ComparePanelProps) {
  // Pixel size of the panel — the PoseOverlay needs it to letterbox the
  // skeleton into the video rect (there's no DrawingCanvas here to measure it).
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(prev =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  if (panel.status === 'empty') {
    return <EmptySlot placeholder={placeholder} onPick={onPick} />;
  }
  if (panel.status === 'loading') {
    return (
      <View style={[styles.panel, styles.centered]}>
        <ActivityIndicator color={colors.text.secondary} />
      </View>
    );
  }
  if (panel.status === 'error' || !panel.uri) {
    return (
      <Pressable style={[styles.panel, styles.centered]} onPress={onPick}>
        <Text style={styles.errorText}>Couldn’t load this swing.</Text>
        <Text style={styles.errorAction}>Tap to pick another</Text>
      </Pressable>
    );
  }

  const marked = panel.impactMs !== null;
  const impactFrac =
    panel.impactMs !== null && panel.durationMs > 0
      ? Math.min(1, Math.max(0, panel.impactMs / panel.durationMs))
      : null;

  return (
    <View style={styles.panel} onLayout={onLayout}>
      <VideoPlayer
        ref={playerRef}
        uri={panel.uri}
        paused={!panel.isPlaying}
        rate={panel.rate}
        // Drive progress at ~30fps while this panel's skeleton is live so it
        // animates smoothly with playback; back to 10fps otherwise.
        progressUpdateIntervalMs={panel.poseTrackStatus === 'ready' ? 33 : 100}
        onLoadedDurationMs={panel.setDuration}
        onProgressMs={panel.setProgress}
        onEnd={panel.onEnd}
      />

      {/* Pose skeleton — above the video, below the chrome. Purely visual
          (pointerEvents none), so it never steals the play/scrub taps. */}
      <PoseOverlay frame={panel.poseFrame} canvasSize={size} />

      {/* Tap surface — toggles play/pause. Sits above the video, below the
          chrome (label / cluster / scrub capture their own touches). */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={panel.toggle}
        accessibilityRole="button"
        accessibilityLabel={panel.isPlaying ? 'Pause' : 'Play'}
      />

      {!panel.isPlaying ? (
        <View style={styles.centerPlay} pointerEvents="none">
          <PlayIcon />
        </View>
      ) : null}

      {/* Label pill (tap to change the video) */}
      <Pressable style={styles.labelPill} onPress={onPick} hitSlop={6}>
        <View style={styles.labelDot} />
        <Text style={styles.labelText} numberOfLines={1}>
          {panel.label}
        </Text>
      </Pressable>

      {/* Top-right control cluster — pose (when the engine is ready) +
          mark-impact. Mirrors the floating-glass-pill language of the label. */}
      <View style={styles.cluster}>
        {panel.poseAvailable ? (
          <Pressable
            style={styles.ctrlPill}
            onPress={panel.togglePose}
            accessibilityRole="button"
            accessibilityLabel="Toggle pose overlay"
            accessibilityState={{ selected: panel.poseEnabled }}
            hitSlop={6}>
            <PoseGlyph active={panel.poseEnabled} />
            <Text
              style={[
                styles.ctrlLabel,
                panel.poseEnabled && styles.ctrlLabelPose,
              ]}>
              Pose
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.ctrlPill}
          onPress={panel.markImpact}
          accessibilityRole="button"
          accessibilityLabel="Mark impact frame"
          accessibilityState={{ selected: marked }}
          hitSlop={6}>
          <FlagGlyph marked={marked} />
          <Text style={[styles.ctrlLabel, marked && styles.ctrlLabelImpact]}>
            Impact
          </Text>
        </Pressable>
      </View>

      {/* Bottom scrim — scrub (with amber impact tick) + speed */}
      <View style={styles.scrim} pointerEvents="box-none">
        <Text style={styles.time}>{formatTime(panel.currentMs)}</Text>
        <View style={styles.sliderWrap}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(1, panel.durationMs)}
            value={Math.min(panel.currentMs, panel.durationMs || panel.currentMs)}
            onValueChange={panel.seekMs}
            minimumTrackTintColor={colors.text.primary}
            maximumTrackTintColor="rgba(255,255,255,0.18)"
            thumbTintColor={colors.text.primary}
          />
          {impactFrac !== null ? (
            <View
              testID="impact-tick"
              style={[styles.impactTick, { left: `${impactFrac * 100}%` }]}
              pointerEvents="none"
            />
          ) : null}
        </View>
        <View style={styles.speedGroup}>
          {COMPARE_RATES.map(r => {
            const active = r === panel.rate;
            return (
              <Pressable
                key={r}
                onPress={() => panel.setRate(r)}
                accessibilityRole="button"
                accessibilityLabel={`${r}x speed`}
                accessibilityState={{ selected: active }}
                style={[styles.speedPill, active && styles.speedPillActive]}
                hitSlop={6}>
                <Text style={[styles.speedLabel, active && styles.speedLabelActive]}>
                  {r}×
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {panel.poseTrackStatus === 'analyzing' ? (
        <View style={styles.analyzeWrap} pointerEvents="none">
          <View style={styles.analyzeCard}>
            <ActivityIndicator size="small" color={colors.gold.default} />
            <Text style={styles.analyzeLabel}>Analyzing pose…</Text>
            <Text style={styles.analyzeSub}>{panel.poseElapsedSec}s</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ───── Empty slot ──────────────────────────────────────────────────────────

interface EmptySlotProps {
  placeholder: string;
  onPick: () => void;
}

function EmptySlot({ placeholder, onPick }: EmptySlotProps) {
  return (
    <Pressable
      style={[styles.panel, styles.centered, styles.emptySlot]}
      onPress={onPick}
      accessibilityRole="button"
      accessibilityLabel={`Pick ${placeholder}`}>
      <View style={styles.emptyIcon}>
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 6v12M6 12h12"
            stroke={colors.text.secondary}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      </View>
      <Text style={styles.emptyTitle}>Pick a swing</Text>
      <Text style={styles.emptySub}>{placeholder}</Text>
    </Pressable>
  );
}

// ───── Icons / helpers ───────────────────────────────────────────────────

function PlayIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill={colors.text.primary}>
      <Path d="M8 5l12 7-12 7z" />
    </Svg>
  );
}

// Pose "person" glyph — paths verbatim from PlaybackChrome's pose pill so
// the overlay toggle reads identically across the app.
function PoseGlyph({ active }: { active: boolean }) {
  const stroke = active ? colors.gold.default : CTRL_INACTIVE;
  return (
    <Svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Circle cx={13} cy={4} r={2} fill={stroke} stroke="none" />
      <Path d="M13 8l-2 5 3 2 1 6" />
      <Path d="M11 13l-4 2" />
      <Path d="M9 22l2-7" />
    </Svg>
  );
}

// Flag glyph for mark-impact — amber when set, matching the scrub tick.
function FlagGlyph({ marked }: { marked: boolean }) {
  const col = marked ? colors.semantic.warning : CTRL_INACTIVE;
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Line x1={5} y1={3} x2={5} y2={21} stroke={col} strokeWidth={2} strokeLinecap="round" />
      <Path
        d="M5 4h12l-2.5 3.5L17 11H5z"
        stroke={col}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const SCRIM = 'rgba(0,0,0,0.55)';
const PILL_BG = 'rgba(12,12,12,0.6)';
const PILL_BORDER = 'rgba(255,255,255,0.1)';
const CTRL_INACTIVE = 'rgba(240,237,232,0.78)';

const TICK_HEIGHT = 11;
const SLIDER_HEIGHT = 28;

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: colors.always.black,
    overflow: 'hidden',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  emptySlot: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
    backgroundColor: colors.bg.base,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  emptyTitle: {
    ...typography.title3,
  },
  emptySub: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  errorText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  errorAction: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  centerPlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelPill: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 28,
    paddingHorizontal: spacing[3],
    borderRadius: layout.borderRadius.full,
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: PILL_BORDER,
  },
  labelDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.text.primary,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    maxWidth: 160,
  },
  cluster: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  ctrlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1] + 1,
    height: 28,
    paddingHorizontal: spacing[2] + 2,
    borderRadius: layout.borderRadius.full,
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: PILL_BORDER,
  },
  ctrlLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: CTRL_INACTIVE,
  },
  ctrlLabelPose: {
    color: colors.gold.default,
  },
  ctrlLabelImpact: {
    color: colors.semantic.warning,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[3],
    backgroundColor: SCRIM,
  },
  time: {
    fontFamily: typography.dataSmall.fontFamily,
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(240,237,232,0.8)',
    minWidth: 28,
  },
  sliderWrap: {
    flex: 1,
    height: SLIDER_HEIGHT,
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: SLIDER_HEIGHT,
  },
  impactTick: {
    position: 'absolute',
    width: 2,
    height: TICK_HEIGHT,
    top: (SLIDER_HEIGHT - TICK_HEIGHT) / 2,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: colors.semantic.warning,
  },
  speedGroup: {
    flexDirection: 'row',
    gap: spacing[1],
    padding: 3,
    borderRadius: layout.borderRadius.full,
    backgroundColor: PILL_BG,
    borderWidth: 1,
    borderColor: PILL_BORDER,
  },
  speedPill: {
    height: 24,
    paddingHorizontal: spacing[2] + 2,
    borderRadius: layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedPillActive: {
    backgroundColor: colors.text.primary,
  },
  speedLabel: {
    fontFamily: typography.dataSmall.fontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(240,237,232,0.6)',
  },
  speedLabelActive: {
    color: colors.always.black,
  },
  analyzeWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: layout.borderRadius.full,
    backgroundColor: 'rgba(20,20,20,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  analyzeLabel: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  analyzeSub: {
    fontFamily: typography.dataSmall.fontFamily,
    fontSize: 12,
    color: colors.text.secondary,
  },
});
