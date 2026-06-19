/**
 * SyncStrip — Feature component
 * The 52px strip between the two stacked panels (portrait): a descriptor
 * label + the Sync toggle. Sync locks the two timelines to their impact
 * frames; it can only be turned on once BOTH panels have an impact marked,
 * so the label switches to a prompt until then.
 *
 * Layout per Design/Caddie Screens.dc.html §05 (portrait · sync strip). The
 * toggle itself is the shared SyncToggle (also used floating in landscape).
 *
 * Part of: src/features/comparison/
 */

import { StyleSheet, Text, View } from 'react-native';

import { SyncToggle } from '@/features/comparison/components/SyncToggle';
import { colors, spacing } from '@/theme';

interface SyncStripProps {
  syncOn: boolean;
  /** Both panels have an impact marked — Sync can be turned on. */
  canSync: boolean;
  onToggle: () => void;
}

export function SyncStrip({ syncOn, canSync, onToggle }: SyncStripProps) {
  return (
    <View style={styles.strip}>
      <Text style={styles.label}>
        {canSync ? 'Impact aligned' : 'Mark impact on both'}
      </Text>
      <SyncToggle
        variant="strip"
        syncOn={syncOn}
        canSync={canSync}
        onToggle={onToggle}
      />
    </View>
  );
}

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
});
