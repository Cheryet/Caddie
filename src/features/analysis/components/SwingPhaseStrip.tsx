/**
 * SwingPhaseStrip — Feature component
 * An 8-dot indicator of where the referenced frame sits in the swing
 * (Address→Finish), with the position name + ordinal ("Top · 4 of 8").
 * Orients the golfer temporally on the InsightDetailScreen. Reads the
 * canonical positions from SWING_POSITIONS so it never drifts from the
 * frame extractor's labelling.
 *
 * Part of: src/features/analysis/
 */

import { StyleSheet, Text, View } from 'react-native';

import {
  SWING_POSITION_COUNT,
  SWING_POSITIONS,
} from '@/constants/swingPositions';
import { colors, spacing, typography } from '@/theme';

interface SwingPhaseStripProps {
  /** 0–7 — the canonical swing position the insight references. */
  frameIndex: number;
}

export function SwingPhaseStrip({ frameIndex }: SwingPhaseStripProps) {
  const position = SWING_POSITIONS[frameIndex];
  if (!position) return null;

  return (
    <View style={styles.row}>
      <View style={styles.dots}>
        {SWING_POSITIONS.map(p => (
          <View
            key={p.id}
            style={[styles.dot, p.index === frameIndex && styles.dotActive]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        {position.name} · {frameIndex + 1} of {SWING_POSITION_COUNT}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1] + 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border.strong,
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold.default,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
