/**
 * PlaybackChrome — Feature component
 * The overlay UI for the playback surface. Mirrors Caddie
 * Screens.dc.html §02 PlaybackScreen — top bar, transport row, scrub
 * track, speed row. Visibility is driven by the parent (the usePlayback
 * hook owns the auto-hide timer); when hidden the chrome fades to 0
 * but still mounts so taps can re-show it via the parent's
 * `toggleChrome`.
 *
 * Drawing toolbar, pose toggle pill, and the "Analyse with AI" gold
 * CTA from the design are deliberately omitted — they belong to later
 * phases. See TODO.md.
 */

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Polyline, Rect } from 'react-native-svg';

import { colors, layout, spacing, typography } from '@/theme';
import { PLAYBACK_RATES, type PlaybackRate } from '@/features/playback/hooks/usePlayback';

interface PlaybackChromeProps {
  visible: boolean;
  // Title strip
  title: string;
  subtitle: string;
  onBack: () => void;
  onShare: () => void;
  // Transport
  isPlaying: boolean;
  currentMs: number;
  durationMs: number;
  onToggle: () => void;
  onStepPrev: () => void;
  onStepNext: () => void;
  // Scrub
  onSeekMs: (ms: number) => void;
  // Speed
  rate: PlaybackRate;
  onRate: (rate: PlaybackRate) => void;
  /** Optional overlay rendered inside the chrome's fade region. Used
   *  by Phase 2.2's DrawingToolbar so it auto-hides with the chrome. */
  children?: ReactNode;
}

const ANIM_MS = 180;

export function PlaybackChrome({
  visible,
  title,
  subtitle,
  onBack,
  onShare,
  isPlaying,
  currentMs,
  durationMs,
  onToggle,
  onStepPrev,
  onStepNext,
  onSeekMs,
  rate,
  onRate,
  children,
}: PlaybackChromeProps) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: ANIM_MS });
  }, [visible, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      // `box-none` so the empty middle of the screen passes touches
      // through to the drawing canvas / player below; only the
      // chrome's actual UI children (buttons, slider, toolbar) catch.
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[StyleSheet.absoluteFill, animatedStyle]}
    >
      {/* Top scrim + bar */}
      <View style={styles.topScrim} pointerEvents="none" />
      <View
        style={[styles.topBar, { paddingTop: insets.top + spacing[2] }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Close playback"
          style={styles.chromeButton}
          hitSlop={10}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Polyline
              points="6 9 12 15 18 9"
              stroke={colors.text.primary}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <View style={styles.titleGroup}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Share swing"
          style={[styles.chromeButton, styles.shareButton]}
          hitSlop={10}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 15V3"
              stroke={colors.text.primary}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Path
              d="M8 7l4-4 4 4"
              stroke={colors.text.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M5 12v7h14v-7"
              stroke={colors.text.primary}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      {/* Bottom scrim + controls */}
      <View
        style={[
          styles.bottomScrim,
          { paddingBottom: insets.bottom + spacing[6] },
        ]}
        pointerEvents="box-none"
      >
        {/* Transport */}
        <View style={styles.transportRow}>
          <Pressable
            onPress={onStepPrev}
            accessibilityLabel="Previous frame"
            accessibilityRole="button"
            hitSlop={10}
            style={styles.stepButton}
          >
            <Svg width={26} height={26} viewBox="0 0 24 24" fill={colors.text.primary}>
              <Rect x={5} y={5} width={2.4} height={14} rx={1} />
              <Path d="M20 5L9 12l11 7z" />
            </Svg>
          </Pressable>
          <Pressable
            onPress={onToggle}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            accessibilityRole="button"
            hitSlop={10}
            style={styles.playButton}
          >
            {isPlaying ? (
              <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.text.inverse}>
                <Rect x={6} y={5} width={4} height={14} rx={1.4} />
                <Rect x={14} y={5} width={4} height={14} rx={1.4} />
              </Svg>
            ) : (
              <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.text.inverse}>
                <Path d="M8 5l12 7-12 7z" />
              </Svg>
            )}
          </Pressable>
          <Pressable
            onPress={onStepNext}
            accessibilityLabel="Next frame"
            accessibilityRole="button"
            hitSlop={10}
            style={styles.stepButton}
          >
            <Svg width={26} height={26} viewBox="0 0 24 24" fill={colors.text.primary}>
              <Rect x={16.6} y={5} width={2.4} height={14} rx={1} />
              <Path d="M4 5l11 7L4 19z" />
            </Svg>
          </Pressable>
        </View>

        {/* Scrub */}
        <View style={styles.scrubRow}>
          <Text style={styles.timeLabel}>{formatTime(currentMs)}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(1, durationMs)}
            value={Math.min(currentMs, durationMs || currentMs)}
            onValueChange={onSeekMs}
            minimumTrackTintColor={colors.text.primary}
            maximumTrackTintColor="rgba(255,255,255,0.18)"
            thumbTintColor={colors.text.primary}
          />
          <Text style={[styles.timeLabel, styles.timeLabelEnd]}>
            {formatTime(durationMs)}
          </Text>
        </View>

        {/* Speed */}
        <View style={styles.speedRow}>
          {PLAYBACK_RATES.map(r => {
            const active = r === rate;
            return (
              <Pressable
                key={r}
                onPress={() => onRate(r)}
                accessibilityLabel={`${r}x speed`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={styles.speedButton}
                hitSlop={8}
              >
                <Text
                  style={[styles.speedLabel, active && styles.speedLabelActive]}
                >
                  {formatRate(r)}
                </Text>
                {active ? <View style={styles.speedUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {children}
    </Animated.View>
  );
}

// ───── Formatting helpers ────────────────────────────────────────────────

function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatRate(rate: PlaybackRate): string {
  return `${rate}×`;
}

// ───── Styles ────────────────────────────────────────────────────────────

const TOP_SCRIM_HEIGHT = 150;
const CHROME_BG = 'rgba(20,20,20,0.55)';
const CHROME_BORDER = 'rgba(255,255,255,0.1)';
const MONO_TIME_FONT_SIZE = 11;

const styles = StyleSheet.create({
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TOP_SCRIM_HEIGHT,
    backgroundColor: 'rgba(0,0,0,0.72)',
    // Approximation of design's linear-gradient — RN doesn't have native
    // gradients without an extra dep. A solid scrim at 0.72 reads close
    // enough; if the falloff matters later we can pull in
    // react-native-linear-gradient. Tracked as a TODO.
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing[2],
  },
  chromeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CHROME_BG,
    borderWidth: 1,
    borderColor: CHROME_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    // No additional style — opacity could indicate disabled in future.
  },
  titleGroup: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 0.3,
    color: 'rgba(240,237,232,0.6)',
    marginTop: 1,
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: spacing[10],
    paddingHorizontal: layout.screenPaddingH,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8] - 2, // ~30 to match design
    marginBottom: spacing[5] - 2,
  },
  stepButton: {
    padding: spacing[1],
  },
  playButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(240,237,232,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3] + 2,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  timeLabel: {
    fontFamily: typography.dataSmall.fontFamily,
    fontSize: MONO_TIME_FONT_SIZE,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: 'rgba(240,237,232,0.85)',
    minWidth: 32,
  },
  timeLabelEnd: {
    color: 'rgba(240,237,232,0.5)',
    textAlign: 'right',
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  speedButton: {
    position: 'relative',
    height: 30,
    paddingHorizontal: spacing[3] + 2,
    borderRadius: layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedLabel: {
    fontFamily: typography.dataSmall.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(240,237,232,0.55)',
  },
  speedLabelActive: {
    color: colors.text.primary,
  },
  speedUnderline: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.text.primary,
  },
});
