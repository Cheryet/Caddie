/**
 * SyncStrip — Feature component
 * The 52px strip between the two stacked panels (portrait): a descriptor
 * label + the Sync toggle. Sync locks the two timelines to their impact
 * frames; it can only be turned on once BOTH panels have an impact marked,
 * so the toggle dims and the label switches to a prompt until then.
 *
 * Layout per Design/Caddie Screens.dc.html §05 (portrait · sync strip).
 * Purely presentational — state + handler come from useComparison via props.
 *
 * Part of: src/features/comparison/
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';

import { colors, layout, spacing } from '@/theme';

interface SyncStripProps {
  syncOn: boolean;
  /** Both panels have an impact marked — Sync can be turned on. */
  canSync: boolean;
  onToggle: () => void;
}

export function SyncStrip({ syncOn, canSync, onToggle }: SyncStripProps) {
  // Green when on; neutral when off. Reuses semantic.success (the design's
  // brighter on-label #6DC98A is tracked for promotion to a token — TODO.md).
  const accent = syncOn ? colors.semantic.success : colors.text.secondary;
  const trackColor = syncOn ? colors.semantic.success : colors.border.default;

  return (
    <View style={styles.strip}>
      <Text style={styles.label}>
        {canSync ? 'Impact aligned' : 'Mark impact on both'}
      </Text>
      <Pressable
        onPress={canSync ? onToggle : undefined}
        disabled={!canSync}
        accessibilityRole="switch"
        accessibilityLabel="Sync timelines"
        accessibilityState={{ checked: syncOn, disabled: !canSync }}
        style={[styles.toggle, !canSync && styles.toggleDisabled]}
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
        <Text style={[styles.syncLabel, { color: accent }]}>Sync</Text>
        <View style={[styles.track, { backgroundColor: trackColor }]}>
          <View style={[styles.knob, syncOn ? styles.knobOn : styles.knobOff]} />
        </View>
      </Pressable>
    </View>
  );
}

const TRACK_WIDTH = 38;
const KNOB_SIZE = 18;
const KNOB_INSET = 2;

const styles = StyleSheet.create({
  strip: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    backgroundColor: colors.bg.elevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: colors.text.tertiary,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2] + 1,
    height: 30,
    paddingLeft: spacing[3],
    paddingRight: spacing[2] - 2,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  toggleDisabled: {
    opacity: 0.45,
  },
  syncLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    width: TRACK_WIDTH,
    height: 22,
    borderRadius: layout.borderRadius.full,
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: colors.text.primary,
    shadowColor: colors.always.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  knobOff: {
    left: KNOB_INSET,
  },
  knobOn: {
    left: TRACK_WIDTH - KNOB_SIZE - KNOB_INSET,
  },
});
