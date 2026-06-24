/**
 * InsightFrame — Feature component
 * The hero of the InsightDetailScreen: the swing frame the insight refers to.
 * Presentational — the screen owns `useInsightFrame` and passes the state in.
 *
 * States:
 *   loading → a full-bleed Skeleton (the still is being extracted natively).
 *   ready   → the frame, `contain`-fit on a black inner so neither a portrait
 *             nor a landscape clip is cropped (never cut the club/head).
 *   error   → a frameless fallback: the enlarged severity glyph tile (same
 *             visual language as IssueCard) + a quiet caption. The insight
 *             text below still delivers the full value.
 *
 * Part of: src/features/analysis/
 */

import { Image, StyleSheet, Text, View } from 'react-native';

import { BADGE_PALETTE, Skeleton } from '@/components/ui';
import { SeverityIcon } from '@/features/analysis/components/AnalysisIcons';
import { SEVERITY_VARIANT } from '@/features/analysis/severity';
import type { InsightFrameStatus } from '@/features/analysis/hooks/useInsightFrame';
import type { IssueSeverity } from '@/types/analysis';
import { colors, layout, spacing, typography } from '@/theme';

interface InsightFrameProps {
  status: InsightFrameStatus;
  frameUri: string | null;
  /** Drives the colour of the frameless fallback glyph tile. */
  severity: IssueSeverity;
}

export function InsightFrame({ status, frameUri, severity }: InsightFrameProps) {
  return (
    <View style={styles.frame}>
      {status === 'ready' && frameUri ? (
        <Image
          testID="insight-frame-image"
          source={{ uri: frameUri }}
          style={styles.image}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityRole="image"
          accessibilityLabel="Your swing at this position"
        />
      ) : status === 'loading' ? (
        <View testID="insight-frame-loading" style={styles.fill}>
          <Skeleton width="100%" height="100%" borderRadius={layout.borderRadius.lg} />
        </View>
      ) : (
        <FramelessFallback severity={severity} />
      )}
    </View>
  );
}

function FramelessFallback({ severity }: { severity: IssueSeverity }) {
  const palette = BADGE_PALETTE[SEVERITY_VARIANT[severity]];
  return (
    <View testID="insight-frame-fallback" style={styles.fallback}>
      <View style={[styles.fallbackTile, { backgroundColor: palette.bg }]}>
        <SeverityIcon severity={severity} color={palette.text} size={28} />
      </View>
      <Text style={styles.fallbackText}>Frame unavailable</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 3 / 4,
    width: '100%',
    borderRadius: layout.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bg.base,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  fill: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  fallbackTile: {
    width: 56,
    height: 56,
    borderRadius: layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});
