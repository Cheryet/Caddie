/**
 * HomeCoachingCard — Feature component
 * The "From your last session" quote on HomeScreen (Design/Caddie
 * Screens.dc.html §01, lines 94–102): a gold AI star beside the most recent
 * coaching summary, attributed across the swings it draws on.
 *
 * This is a separate component from analysis/CoachingCard: that one is
 * deliberately gold-neutral (gold is the AnalysisScreen's single drill CTA)
 * and hard-codes "this swing", whereas the Home version is gold-marked and
 * spans multiple swings. Reusing it would couple home→analysis internals and
 * force divergent props, so we compose the shared `Card` primitive instead.
 *
 * Presentational only. Pro-gated by the screen (PROJECT_SPEC §22 Phase 5.2).
 * Part of: src/features/home/
 */

import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { CoachingStarIcon } from '@/features/home/components/HomeIcons';
import type { HomeCoaching } from '@/features/home/hooks/useHomeDashboard';
import { colors, layout, spacing, typography } from '@/theme';

export function HomeCoachingCard({ text, spanCount }: HomeCoaching) {
  const swingWord = spanCount === 1 ? 'swing' : 'swings';

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.mark}>
          <CoachingStarIcon size={18} color={colors.gold.default} />
        </View>
        <View style={styles.body}>
          <Text style={styles.quote}>“{text}”</Text>
          <Text style={styles.attribution}>
            Caddie AI · across your last {spanCount} {swingWord}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// Gold-at-alpha mark surface — references the gold hue without a new token,
// matching the design's gold-tinted icon well (cf. colors.pose.* alpha golds).
const MARK_FILL = 'rgba(201,168,76,0.12)';
const MARK_BORDER = 'rgba(201,168,76,0.25)';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: layout.borderRadius.md,
    backgroundColor: MARK_FILL,
    borderWidth: 1,
    borderColor: MARK_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  quote: {
    ...typography.body,
    lineHeight: 21,
    color: colors.text.primary,
  },
  attribution: {
    ...typography.caption,
    fontSize: 12,
    marginTop: spacing[2],
  },
});
