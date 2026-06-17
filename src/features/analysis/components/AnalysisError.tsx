/**
 * AnalysisError — Feature component
 * The recoverable error body for AnalysisScreen (PROJECT_SPEC §22 4.3 "Error
 * state: retry button"; AI_IMPLEMENTATION_GUIDE §11 error table). A neutral
 * alert glyph, a title, the failure message, and — when the failure is
 * retryable — a single "Try again" CTA. Daily-limit errors pass no `onRetry`,
 * so no retry button shows (the message tells the user to come back tomorrow).
 *
 * Centred body only; the screen supplies the header. Composes the Button
 * primitive for the CTA.
 *
 * Part of: src/features/analysis/
 */

import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { SeverityIcon } from '@/features/analysis/components/AnalysisIcons';
import { colors, layout, spacing, typography } from '@/theme';

interface AnalysisErrorProps {
  /** Headline; defaults to a generic recoverable-error title. */
  title?: string;
  /** The specific, user-facing failure message. */
  message: string;
  /** Supplied for retryable failures — gates the "Try again" CTA. */
  onRetry?: () => void;
}

export function AnalysisError({
  title = "Analysis didn't go through",
  message,
  onRetry,
}: AnalysisErrorProps) {
  return (
    <View style={styles.root}>
      <View style={styles.iconTile}>
        {/* Neutral (not amber) so it reads as "error", not a moderate issue. */}
        <SeverityIcon severity="moderate" color={colors.text.secondary} size={26} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <View style={styles.cta}>
          <Button label="Try again" variant="primary" size="md" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[5],
  },
  title: {
    ...typography.title2,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[2],
    maxWidth: 300,
  },
  cta: {
    marginTop: spacing[6],
    alignSelf: 'stretch',
    alignItems: 'center',
  },
});
