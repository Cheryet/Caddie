/**
 * InsightDetailScreen — Screen
 * Drill-down from a single analysis issue (tapped on the report). Shows the
 * swing frame the insight references — re-derived on demand from the stored
 * video via `useInsightFrame` — with the full insight beneath it: the fault,
 * its severity, what's happening, and how to fix it.
 *
 * The insight text arrives in route params, so it renders instantly; the
 * frame loads async and degrades to a frameless fallback if it can't be
 * extracted (offline / missing video). Section rhythm + the muted SectionLabel
 * headings match AnalysisScreen so the two screens feel like one report.
 *
 * Part of: src/features/analysis/
 */

import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Card } from '@/components/ui';
import { BackChevronIcon } from '@/features/analysis/components/AnalysisIcons';
import { InsightFrame } from '@/features/analysis/components/InsightFrame';
import { SectionLabel } from '@/features/analysis/components/SectionLabel';
import { SwingPhaseStrip } from '@/features/analysis/components/SwingPhaseStrip';
import { useInsightFrame } from '@/features/analysis/hooks/useInsightFrame';
import { SEVERITY_LABEL, SEVERITY_VARIANT } from '@/features/analysis/severity';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors, layout, spacing, typography } from '@/theme';

export function InsightDetailScreen({
  navigation,
  route,
}: RootStackScreenProps<'InsightDetail'>) {
  const insets = useSafeAreaInsets();
  const { videoId, issue } = route.params;
  const { status, frameUri } = useInsightFrame(videoId, issue.frameIndex);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <InsightHeader onBack={handleBack} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing[8] },
        ]}
        showsVerticalScrollIndicator={false}>
        <InsightFrame
          status={status}
          frameUri={frameUri}
          severity={issue.severity}
        />
        <SwingPhaseStrip frameIndex={issue.frameIndex} />

        <View style={styles.heading}>
          <Text style={styles.name}>{issue.name}</Text>
          <View style={styles.badge}>
            <Badge
              label={SEVERITY_LABEL[issue.severity]}
              variant={SEVERITY_VARIANT[issue.severity]}
            />
          </View>
        </View>

        <SectionLabel>What's happening</SectionLabel>
        <Text style={styles.body}>{issue.description}</Text>

        <SectionLabel>How to fix it</SectionLabel>
        <Card variant="raised">
          <Text style={styles.body}>{issue.fix}</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

// ───── Header ──────────────────────────────────────────────────────────────

function InsightHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back to analysis"
        style={styles.headerButton}>
        <BackChevronIcon color={colors.text.primary} size={22} />
      </Pressable>

      <Text style={styles.headerTitle}>Insight</Text>

      {/* Balances the back button so the title stays centred. */}
      <View style={styles.headerButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.title2,
    fontSize: 17,
  },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[2],
  },
  heading: {
    marginTop: spacing[5],
  },
  name: {
    ...typography.title1,
  },
  badge: {
    flexDirection: 'row',
    marginTop: spacing[3],
  },
  body: {
    ...typography.body,
    color: colors.text.primary,
  },
});
