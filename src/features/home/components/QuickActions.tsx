/**
 * QuickActions — Feature component
 * The "Jump back in" 2×2 action grid on HomeScreen (Design/Caddie
 * Screens.dc.html §01, lines 104–110). Per PROJECT_SPEC §22 Phase 5.2 the
 * four actions are Record, Import, Compare, Tempo (the prototype's fourth
 * "Drills" tile is a V1 feature with no route yet — confirmed with the user).
 *
 * Each tile is a presentational button firing the handler passed by the
 * screen; navigation/wiring lives in HomeScreen.
 * Part of: src/features/home/
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  CameraIcon,
  CompareIcon,
  ImportIcon,
  TempoIcon,
} from '@/features/home/components/HomeIcons';
import { colors, layout, spacing, typography } from '@/theme';

interface QuickActionsProps {
  onRecord: () => void;
  onImport: () => void;
  onCompare: () => void;
  onTempo: () => void;
}

export function QuickActions({
  onRecord,
  onImport,
  onCompare,
  onTempo,
}: QuickActionsProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <ActionTile label="New swing" icon={<CameraIcon />} onPress={onRecord} />
        <ActionTile label="Compare" icon={<CompareIcon />} onPress={onCompare} />
      </View>
      <View style={styles.row}>
        <ActionTile label="Import" icon={<ImportIcon />} onPress={onImport} />
        <ActionTile label="Tempo" icon={<TempoIcon />} onPress={onTempo} />
      </View>
    </View>
  );
}

interface ActionTileProps {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}

function ActionTile({ label, icon, onPress }: ActionTileProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.tile}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing[3],
  },
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.bg.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.title3,
    fontSize: 14,
    letterSpacing: -0.1,
  },
});
