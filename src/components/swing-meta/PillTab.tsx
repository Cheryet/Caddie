/**
 * PillTab — private building block for the segmented controls
 * One toggleable pill inside a `PillRow` (used by AngleSegmented and
 * HandSegmented). Lifted from CameraScreen so the import sheet can
 * reuse the same look without duplicating styles.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing } from '@/theme';

import { PILL_INACTIVE_LABEL } from './tokens';

interface PillTabProps {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Optional height override (HandSegmented uses 30; default 32). */
  height?: number;
}

export function PillTab({
  label,
  active,
  onPress,
  disabled,
  height = 32,
}: PillTabProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[styles.pillTab, { height }]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
    >
      {active ? <View style={styles.pillTabActiveBg} /> : null}
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pillTab: {
    paddingHorizontal: spacing[4],
    borderRadius: layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  pillTabActiveBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.text.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: PILL_INACTIVE_LABEL,
  },
  labelActive: {
    color: colors.text.inverse,
  },
});
