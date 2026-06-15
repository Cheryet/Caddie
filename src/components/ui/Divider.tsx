/**
 * Divider — UI primitive
 * 1px horizontal line for separating sections. Optional left/right inset
 * for indented dividers (e.g. under an avatar in a list row).
 *
 * Source of truth: DESIGN_SYSTEM.md §5 — `border.subtle`, full-bleed by
 * default, 1px.
 */

import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

interface DividerProps {
  /** Horizontal inset in points applied equally to both sides. */
  inset?: number;
}

export function Divider({ inset = 0 }: DividerProps) {
  return (
    <View
      style={[styles.divider, inset > 0 && { marginHorizontal: inset }]}
      accessibilityRole="none"
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
});
