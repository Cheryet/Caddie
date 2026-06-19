/**
 * SyncToggle — Feature component
 * The Sync pill itself: refresh icon + "Sync" label + a track/knob switch.
 * Shared by the portrait SyncStrip (variant "strip", sits inside the strip)
 * and the landscape floating control (variant "floating", a glass pill
 * overlaid top-center). Green when on, neutral when off; disabled (dimmed,
 * non-interactive) until both panels have an impact marked.
 *
 * Icon paths verbatim from Design/Caddie Screens.dc.html §05.
 *
 * Part of: src/features/comparison/
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';

import { colors, layout, spacing } from '@/theme';

export type SyncToggleVariant = 'strip' | 'floating';

interface SyncToggleProps {
  syncOn: boolean;
  /** Both panels have an impact marked — Sync can be turned on. */
  canSync: boolean;
  onToggle: () => void;
  variant?: SyncToggleVariant;
}

// Glass chrome for the floating (landscape) variant, consistent with the
// other over-video pills in this feature.
const FLOAT_BG = 'rgba(12,12,12,0.62)';
const FLOAT_BORDER = 'rgba(255,255,255,0.12)';

const TRACK = {
  strip: { width: 38, height: 22, knob: 18 },
  floating: { width: 40, height: 24, knob: 20 },
} as const;

const INSET = 2;

export function SyncToggle({
  syncOn,
  canSync,
  onToggle,
  variant = 'strip',
}: SyncToggleProps) {
  // Reuses semantic.success; the design's brighter on-green (#6DC98A) is
  // tracked for promotion to a token — TODO.md.
  const accent = syncOn ? colors.semantic.success : colors.text.secondary;
  const trackColor = syncOn ? colors.semantic.success : colors.border.default;
  const t = TRACK[variant];
  const knobLeft = syncOn ? t.width - t.knob - INSET : INSET;

  return (
    <Pressable
      onPress={canSync ? onToggle : undefined}
      disabled={!canSync}
      accessibilityRole="switch"
      accessibilityLabel="Sync timelines"
      accessibilityState={{ checked: syncOn, disabled: !canSync }}
      style={[
        styles.pill,
        variant === 'floating' ? styles.pillFloating : styles.pillStrip,
        !canSync && styles.disabled,
      ]}
      hitSlop={6}>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path
          d="M3 9a9 9 0 0 1 15-3l3 3"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M21 15a9 9 0 0 1-15 3l-3-3"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Polyline
          points="21 3 21 9 15 9"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Polyline
          points="3 21 3 15 9 15"
          stroke={accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={[styles.label, { color: accent }]}>Sync</Text>
      <View
        style={[
          styles.track,
          { width: t.width, height: t.height, backgroundColor: trackColor },
        ]}>
        <View
          style={[
            styles.knob,
            { width: t.knob, height: t.knob, borderRadius: t.knob / 2, left: knobLeft },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2] + 1,
    height: 30,
    paddingLeft: spacing[3],
    paddingRight: spacing[2] - 2,
    borderRadius: layout.borderRadius.full,
    borderWidth: 1,
  },
  pillStrip: {
    backgroundColor: colors.bg.overlay,
    borderColor: colors.border.default,
  },
  pillFloating: {
    height: 34,
    backgroundColor: FLOAT_BG,
    borderColor: FLOAT_BORDER,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    borderRadius: layout.borderRadius.full,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    backgroundColor: colors.text.primary,
    shadowColor: colors.always.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
});
