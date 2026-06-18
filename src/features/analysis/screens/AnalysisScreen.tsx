/**
 * AnalysisScreen — Screen
 * The AI coaching report, presented as a full-screen modal (tab bar hidden).
 * Free users hit the Pro gate; Pro users get the live report via useAnalysis
 * (cache hit → render; cache miss → Claude via the Edge Function). States map
 * to the Phase 4.3 presentational pieces:
 *   loading/analyzing → AnalysisLoading
 *   error             → AnalysisError (retry when the failure is retryable)
 *   ready             → AnalysisContent
 *
 * Gating is the mandated `<ProGate feature="AI Coaching" />` (CLAUDE.md
 * non-negotiable). It also keeps useAnalysis from running for free users:
 * the hook lives in AnalysisReport, which only mounts when isPro.
 */

import { useCallback } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProGate, Toast } from '@/components/ui';
import { AnalysisContent } from '@/features/analysis/components/AnalysisContent';
import { AnalysisError } from '@/features/analysis/components/AnalysisError';
import { AnalysisLoading } from '@/features/analysis/components/AnalysisLoading';
import {
  BackChevronIcon,
  ShareIcon,
} from '@/features/analysis/components/AnalysisIcons';
import { useAnalysis } from '@/features/analysis/hooks/useAnalysis';
import type { AnalysisErrorCode } from '@/features/analysis/parseAnalysis';
import { useSubscription } from '@/features/subscription/hooks/useSubscription';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';

export function AnalysisScreen({
  navigation,
  route,
}: RootStackScreenProps<'Analysis'>) {
  const insets = useSafeAreaInsets();
  const { isPro } = useSubscription();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Free users never run the analysis pipeline — the gate replaces it.
  if (!isPro) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <AnalysisHeader onBack={handleClose} />
        <View style={styles.gateWrap}>
          <ProGate feature="AI Coaching" />
        </View>
      </View>
    );
  }

  return (
    <AnalysisReport
      videoId={route.params.videoId}
      onClose={handleClose}
      topInset={insets.top}
    />
  );
}

// ───── Pro report (owns the hook) ──────────────────────────────────────────

interface AnalysisReportProps {
  videoId: string;
  onClose: () => void;
  topInset: number;
}

function AnalysisReport({ videoId, onClose, topInset }: AnalysisReportProps) {
  const { status, analysis, subtitle, error, refresh } = useAnalysis(videoId);

  const handleShare = useCallback(() => {
    if (!analysis) return;
    Share.share({
      message: `My swing scored ${analysis.score}/100 on Caddie.\n\n${analysis.summary}`,
    }).catch(() => {
      // User dismissed the share sheet — not an error.
    });
  }, [analysis]);

  const handleStartDrill = useCallback(() => {
    Toast.show({ message: 'Guided drills are coming soon.', variant: 'info' });
  }, []);

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <AnalysisHeader
        onBack={onClose}
        onShare={status === 'ready' ? handleShare : undefined}
      />
      {status === 'loading' || status === 'analyzing' ? (
        <AnalysisLoading />
      ) : status === 'error' ? (
        <AnalysisError
          title={errorTitle(error?.code)}
          message={error?.message ?? 'Analysis failed. Please try again.'}
          onRetry={error?.retryable ? refresh : undefined}
        />
      ) : analysis ? (
        <AnalysisContent
          analysis={analysis}
          subtitle={subtitle ?? undefined}
          onStartDrill={handleStartDrill}
        />
      ) : null}
    </View>
  );
}

/** Headline per error code; undefined falls back to AnalysisError's default. */
function errorTitle(code: AnalysisErrorCode | undefined): string | undefined {
  switch (code) {
    case 'rate_limited':
      return 'Daily limit reached';
    case 'unauthenticated':
      return 'Session expired';
    case 'network':
      return 'Connection problem';
    case 'not_found':
      return 'Swing not found';
    default:
      return undefined;
  }
}

// ───── Header ──────────────────────────────────────────────────────────────

interface AnalysisHeaderProps {
  onBack: () => void;
  onShare?: () => void;
}

function AnalysisHeader({ onBack, onShare }: AnalysisHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Close analysis"
        style={styles.headerButton}>
        <BackChevronIcon color={colors.text.primary} size={22} />
      </Pressable>

      <Text style={styles.headerTitle}>Swing analysis</Text>

      {onShare ? (
        <Pressable
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Share analysis"
          style={styles.headerButton}>
          <ShareIcon color={colors.text.secondary} size={18} />
        </Pressable>
      ) : (
        <View style={styles.headerButton} />
      )}
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
  gateWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[12],
  },
});
