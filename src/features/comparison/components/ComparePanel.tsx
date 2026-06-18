/**
 * ComparePanel — Feature component
 * One side of the comparison. Renders the empty "pick a swing" slot, a
 * loading/error state, or the live panel: the video with a tap-to-play
 * surface, a top-left "Club · date" label (tap to change), and a bottom
 * scrim with a scrub slider + 0.5×/1× speed toggle. Layout per Design/Caddie
 * Screens.dc.html §05 (portrait panel).
 *
 * Purely presentational — all state + handlers come from a ComparePanelState
 * (useComparePanel) via props.
 *
 * Part of: src/features/comparison/
 */

import type { Ref } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Svg, { Path } from 'react-native-svg';

import { VideoPlayer } from '@/features/playback/components/VideoPlayer';
import type { VideoPlayerHandle } from '@/features/playback/components/VideoPlayer';
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

  return (
    <View style={styles.panel}>
      <VideoPlayer
        ref={playerRef}
        uri={panel.uri}
        paused={!panel.isPlaying}
        rate={panel.rate}
        onLoadedDurationMs={panel.setDuration}
        onProgressMs={panel.setProgress}
        onEnd={panel.onEnd}
      />

      {/* Tap surface — toggles play/pause. Sits above the video, below the
          chrome (label / scrub / speed capture their own touches). */}
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

      {/* Bottom scrim — scrub + speed */}
      <View style={styles.scrim} pointerEvents="box-none">
        <Text style={styles.time}>{formatTime(panel.currentMs)}</Text>
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
    maxWidth: 200,
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
  slider: {
    flex: 1,
    height: 28,
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
});
