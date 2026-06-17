/**
 * CoachingCard — Feature component
 * The coach's narrative summary (`coaching_text` / Claude `summary`) shown
 * near the top of the report, in the quoted-coaching style from the Home
 * screen's "From your last session" card (Design/Caddie Screens.dc.html,
 * lines 94–102).
 *
 * Spec note: PROJECT_SPEC §22 lists CoachingCard as a 4.3 deliverable but the
 * prototype's AnalysisScreen doesn't draw it explicitly — we render the
 * summary here in the established coaching-quote style.
 *
 * Gold note: the Home version uses a gold AI star, but on this screen gold
 * is reserved for the single drill CTA (DESIGN_SYSTEM §1), so the AI mark
 * here is neutral. Composes the shared Card primitive.
 *
 * Part of: src/features/analysis/
 */

import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { SparkleIcon } from '@/features/analysis/components/AnalysisIcons';
import { colors, layout, spacing, typography } from '@/theme';

interface CoachingCardProps {
  /** The 2–3 sentence coach-voice summary. */
  summary: string;
}

export function CoachingCard({ summary }: CoachingCardProps) {
  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.mark}>
          <SparkleIcon color={colors.text.secondary} size={18} />
        </View>
        <View style={styles.body}>
          <Text style={styles.summary}>{summary}</Text>
          <Text style={styles.attribution}>Caddie AI · this swing</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  summary: {
    ...typography.body,
    lineHeight: 21,
    color: colors.text.primary,
  },
  attribution: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing[2] + 1,
  },
});
