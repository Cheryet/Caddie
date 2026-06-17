/**
 * IssueCard — Feature component
 * One ranked swing fault: a severity-coloured icon tile, the fault name,
 * what's happening (description), the actionable correction (fix), and a
 * severity Badge. Layout + the icon tile are verbatim from Design/Caddie
 * Screens.dc.html §03 (lines 507–523).
 *
 * Deviation from the PROJECT_SPEC §22 4.3 bullet ("frame thumbnail"): the
 * high-fidelity prototype uses a severity glyph tile instead of a frame
 * thumbnail, so we follow the prototype (TODO.md). `frameIndex` is carried
 * on the data for the Phase 4.4 thumbnail wiring.
 *
 * Colours reuse the shared BADGE_PALETTE (AI_IMPLEMENTATION_GUIDE §2 —
 * reuse before create) so the icon tile + Badge stay in lockstep. Gold is
 * deliberately absent — it's reserved for the screen's single CTA.
 *
 * Part of: src/features/analysis/
 */

import { StyleSheet, Text, View } from 'react-native';

import { BADGE_PALETTE, Badge, type BadgeVariant } from '@/components/ui';
import { SeverityIcon } from '@/features/analysis/components/AnalysisIcons';
import type { IssueSeverity, SwingIssue } from '@/types/analysis';
import { colors, layout, spacing, typography } from '@/theme';

const SEVERITY_VARIANT: Record<IssueSeverity, BadgeVariant> = {
  minor: 'success',
  moderate: 'warning',
  major: 'error',
};

const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
};

interface IssueCardProps {
  issue: SwingIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
  const variant = SEVERITY_VARIANT[issue.severity];
  const palette = BADGE_PALETTE[variant];

  return (
    <View style={styles.card}>
      <View style={[styles.iconTile, { backgroundColor: palette.bg }]}>
        <SeverityIcon severity={issue.severity} color={palette.text} size={16} />
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{issue.name}</Text>
        <Text style={styles.description}>{issue.description}</Text>
        <View style={styles.fixRow}>
          <Text style={styles.fixLabel}>Fix</Text>
          <Text style={styles.fixText}>{issue.fix}</Text>
        </View>
      </View>

      <View style={styles.badge}>
        <Badge label={SEVERITY_LABEL[issue.severity]} variant={variant} size="sm" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
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
  body: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.bodyStrong,
    letterSpacing: -0.1,
  },
  description: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.secondary,
    marginTop: 3,
  },
  fixRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing[2],
    gap: spacing[2],
  },
  fixLabel: {
    ...typography.overline,
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 1,
  },
  fixText: {
    ...typography.body,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.primary,
  },
  // Reserve a little space so a long name never collides with the badge.
  badge: {
    alignSelf: 'center',
  },
});
