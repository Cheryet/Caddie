/**
 * AnalysisContent — Feature component
 * The scrollable "ready" report on AnalysisScreen: the score hero, the coach
 * summary, ranked issues, what's already working, and the drill. Pure
 * composition over the report's pieces — the screen owns data + handlers.
 * Section order + the positives card follow Design/Caddie Screens.dc.html §03.
 *
 * The tempo card and the "+N on last session" delta from the prototype are
 * deferred (they need pose-derived timing / analysis history not in the
 * `analyses` model) — see TODO.md.
 *
 * Part of: src/features/analysis/
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui';
import { CheckIcon } from '@/features/analysis/components/AnalysisIcons';
import { CoachingCard } from '@/features/analysis/components/CoachingCard';
import { DrillCard } from '@/features/analysis/components/DrillCard';
import { IssueList } from '@/features/analysis/components/IssueList';
import { SectionLabel } from '@/features/analysis/components/SectionLabel';
import { SwingScore } from '@/features/analysis/components/SwingScore';
import type { SwingAnalysis } from '@/types/analysis';
import { colors, layout, spacing, typography } from '@/theme';

interface AnalysisContentProps {
  analysis: SwingAnalysis;
  /** "Driver · Today" style line under the score (from the video meta). */
  subtitle?: string;
  /** Supplied when the drill can be launched — gates the drill's "Start". */
  onStartDrill?: () => void;
}

export function AnalysisContent({
  analysis,
  subtitle,
  onStartDrill,
}: AnalysisContentProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing[8] },
      ]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <SwingScore score={analysis.score} />
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.coaching}>
        <CoachingCard summary={analysis.summary} />
      </View>

      <IssueList issues={analysis.issues} />

      {analysis.positives.length > 0 ? (
        <View>
          <SectionLabel>What's already working</SectionLabel>
          <PositivesCard positives={analysis.positives} />
        </View>
      ) : null}

      <SectionLabel>Your drill for this</SectionLabel>
      <DrillCard title={analysis.drill} onStart={onStartDrill} />
    </ScrollView>
  );
}

// ───── Positives ("What's already working") ────────────────────────────────

interface PositivesCardProps {
  positives: string[];
}

function PositivesCard({ positives }: PositivesCardProps) {
  return (
    <Card padding={0}>
      <View style={styles.positivesInner}>
        {positives.map((positive, index) => (
          <View
            key={`${positive}-${index}`}
            style={[
              styles.positiveRow,
              index < positives.length - 1 && styles.positiveDivider,
            ]}>
            <CheckIcon color={colors.semantic.success} size={18} />
            <Text style={styles.positiveText}>{positive}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[2],
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing[2] + 2,
    paddingBottom: spacing[1],
  },
  subtitle: {
    ...typography.body,
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing[3] + 2,
  },
  coaching: {
    marginTop: spacing[5],
  },
  positivesInner: {
    paddingHorizontal: spacing[3] + 2,
  },
  positiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3] - 1,
    paddingVertical: spacing[2] + 2,
  },
  positiveDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  positiveText: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
});
