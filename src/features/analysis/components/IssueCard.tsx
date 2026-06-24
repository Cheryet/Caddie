/**
 * IssueCard — Feature component
 * One ranked swing fault as a scannable headline row: a severity-coloured
 * glyph tile, the fault name, and a severity Badge. When tappable it gains a
 * disclosure chevron and opens the InsightDetailScreen, where the full
 * description and fix live alongside the swing frame.
 *
 * The description and fix are deliberately NOT shown here — keeping the card to
 * a headline removes the cramped, duplicated prose and gives the report a clear
 * visual hierarchy (a product decision that departs from the Design/ §03 inline
 * card; the full text is always one tap away on the detail screen).
 *
 * Colours reuse the shared BADGE_PALETTE (AI_IMPLEMENTATION_GUIDE §2 — reuse
 * before create) so the glyph tile + Badge stay in lockstep. Gold is
 * deliberately absent — it's reserved for the screen's single CTA. `frameIndex`
 * rides along on the issue data so the detail screen can locate the frame.
 *
 * Part of: src/features/analysis/
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BADGE_PALETTE, Badge } from '@/components/ui';
import {
  ForwardChevronIcon,
  SeverityIcon,
} from '@/features/analysis/components/AnalysisIcons';
import { SEVERITY_LABEL, SEVERITY_VARIANT } from '@/features/analysis/severity';
import type { SwingIssue } from '@/types/analysis';
import { colors, layout, spacing, typography } from '@/theme';

interface IssueCardProps {
  issue: SwingIssue;
  /** When set, the whole card becomes a button (opens the insight detail) and
   *  shows a disclosure chevron. Absent → a static, non-interactive row. */
  onPress?: () => void;
}

export function IssueCard({ issue, onPress }: IssueCardProps) {
  const variant = SEVERITY_VARIANT[issue.severity];
  const palette = BADGE_PALETTE[variant];

  const content = (
    <>
      <View style={[styles.iconTile, { backgroundColor: palette.bg }]}>
        <SeverityIcon severity={issue.severity} color={palette.text} size={16} />
      </View>

      <Text style={styles.name}>{issue.name}</Text>

      <View style={styles.trailing}>
        <Badge label={SEVERITY_LABEL[issue.severity]} variant={variant} size="sm" />
        {onPress ? (
          <ForwardChevronIcon color={colors.text.tertiary} size={18} />
        ) : null}
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`See ${issue.name} in detail`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'center',
    padding: 13,
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typography.bodyStrong,
    flex: 1,
    letterSpacing: -0.1,
  },
  cardPressed: {
    backgroundColor: colors.bg.overlay,
  },
  // Right column: the severity badge, plus a disclosure chevron when tappable.
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
});
