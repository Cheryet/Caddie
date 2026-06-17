/**
 * SectionLabel — Feature component
 * The small muted section heading repeated down AnalysisScreen ("What to
 * work on", "What's already working", "Your drill for this"). One
 * implementation so the three headings stay identical. Style verbatim from
 * Design/Caddie Screens.dc.html §03 (13px/600, secondary).
 *
 * Part of: src/features/analysis/
 */

import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/theme';

interface SectionLabelProps {
  children: string;
}

export function SectionLabel({ children }: SectionLabelProps) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...typography.label,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing[6],
    marginBottom: spacing[3],
    marginHorizontal: 2,
  },
});
