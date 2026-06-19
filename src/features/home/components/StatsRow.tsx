/**
 * StatsRow — Feature component
 * The three headline numbers on HomeScreen — swings, analyses, day streak —
 * in a 3-up grid of bordered tiles. Mirrors Design/Caddie Screens.dc.html
 * §01 (lines 72–76): mono numerals, tertiary captions, and a single gold
 * flame on the streak tile (the row's only accent, DESIGN_SYSTEM §1).
 *
 * Presentational only — receives the counts via props.
 * Part of: src/features/home/
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FlameIcon } from '@/features/home/components/HomeIcons';
import type { HomeStats } from '@/features/home/hooks/useHomeDashboard';
import { colors, layout, spacing, typography } from '@/theme';

export function StatsRow({ swings, analyses, streakDays }: HomeStats) {
  return (
    <View style={styles.row}>
      <StatTile value={swings} label="swings" />
      <StatTile value={analyses} label="analyses" />
      <StatTile
        value={streakDays}
        label="day streak"
        accessory={<FlameIcon />}
      />
    </View>
  );
}

interface StatTileProps {
  value: number;
  label: string;
  accessory?: ReactNode;
}

function StatTile({ value, label, accessory }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <View style={styles.valueRow}>
        <Text style={styles.value} allowFontScaling={false}>
          {value}
        </Text>
        {accessory}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[3], // 12
  },
  tile: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: layout.borderRadius.lg,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    ...typography.data,
    fontSize: 24,
    lineHeight: 26,
  },
  label: {
    ...typography.caption,
    marginTop: spacing[1],
  },
});
