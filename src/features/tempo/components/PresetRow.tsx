/**
 * PresetRow — Feature component
 * The four tempo preset slots (Design §07, prototype L1919–1940). Each slot
 * has four visual states: saved (green flash after a long-press), active
 * (gold, when its value equals the current BPM), empty (dashed + plus), and
 * filled (the stored BPM). Tap a filled slot to load it; long-press any slot
 * to save the current BPM.
 *
 * Presentational — press handlers come from useTempo (it owns the tap-vs-
 * long-press timing). Precedence matches the prototype: saved > active >
 * empty > filled.
 *
 * Part of: src/features/tempo/
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PresetPlusIcon } from '@/features/tempo/components/TempoIcons';
import { colors, layout, typography } from '@/theme';

interface PresetRowProps {
  presets: (number | null)[];
  bpm: number;
  /** Index flashing "Saved", or -1. */
  savedSlot: number;
  onSlotDown: (index: number) => void;
  onSlotUp: (index: number) => void;
}

export function PresetRow({
  presets,
  bpm,
  savedSlot,
  onSlotDown,
  onSlotUp,
}: PresetRowProps) {
  return (
    <View style={styles.row}>
      {presets.map((value, i) => (
        <PresetSlot
          // Slot identity is positional (fixed 4 slots), so index is the key.
          key={`preset-${i}`}
          value={value}
          isSaved={savedSlot === i}
          isActive={value != null && value === bpm}
          onPressIn={() => onSlotDown(i)}
          onPressOut={() => onSlotUp(i)}
        />
      ))}
    </View>
  );
}

interface PresetSlotProps {
  value: number | null;
  isSaved: boolean;
  isActive: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
}

function PresetSlot({
  value,
  isSaved,
  isActive,
  onPressIn,
  onPressOut,
}: PresetSlotProps) {
  const isEmpty = value == null;
  const surface = isSaved
    ? styles.slotSaved
    : isActive
      ? styles.slotActive
      : isEmpty
        ? styles.slotEmpty
        : styles.slotFilled;

  const a11yLabel = isEmpty
    ? 'Empty preset slot'
    : `Preset ${value} BPM${isActive ? ', active' : ''}`;

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Tap to load, long-press to save the current tempo"
      style={[styles.slot, surface]}>
      {isEmpty ? (
        <PresetPlusIcon />
      ) : (
        <>
          <Text
            style={[styles.value, isActive && styles.valueActive]}
            allowFontScaling={false}>
            {value}
          </Text>
          {isSaved ? (
            <Text style={styles.savedLabel}>Saved</Text>
          ) : (
            <Text style={styles.bpmLabel}>bpm</Text>
          )}
        </>
      )}
    </Pressable>
  );
}

// Green / gold at alpha — design literals (cf. VideoCard's success-green rgba).
const SAVED_BG = 'rgba(109,201,138,0.12)';
const SAVED_BORDER = '#2D6644';
const ACTIVE_BG = 'rgba(201,168,76,0.13)';
const ACTIVE_BORDER = 'rgba(201,168,76,0.5)';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 9,
  },
  slot: {
    flex: 1,
    height: 62,
    borderRadius: layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
  },
  slotFilled: {
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border.subtle,
  },
  slotEmpty: {
    backgroundColor: colors.bg.base,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  slotActive: {
    backgroundColor: ACTIVE_BG,
    borderColor: ACTIVE_BORDER,
  },
  slotSaved: {
    backgroundColor: SAVED_BG,
    borderColor: SAVED_BORDER,
  },
  value: {
    ...typography.data,
    fontSize: 21,
    lineHeight: 23,
    letterSpacing: -1,
  },
  valueActive: {
    color: colors.gold.bright,
  },
  bpmLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.text.tertiary,
  },
  savedLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: colors.semantic.success,
  },
});
