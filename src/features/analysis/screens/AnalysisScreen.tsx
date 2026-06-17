/**
 * AnalysisScreen — Screen
 * The AI coaching report, presented as a full-screen modal (tab bar hidden).
 * Branches across the three states from PROJECT_SPEC §22 Phase 4.3:
 *   loading → AnalysisLoading   (sparkle + elapsed time + staged progress)
 *   error   → AnalysisError     (message + retry)
 *   ready   → AnalysisContent   (score · coaching · issues · drill)
 *
 * Phase 4.3 renders from a typed mock (mockAnalysis). Phase 4.4 replaces the
 * local state machine with the `useAnalysis` hook (Edge Function + cache) and
 * gates the whole screen behind <ProGate feature="AI Coaching" />.
 *
 * A __DEV__-only switcher cycles the three states so they're verifiable on
 * the simulator; it is compiled out of release builds.
 */

import { useCallback, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast } from '@/components/ui';
import { AnalysisContent } from '@/features/analysis/components/AnalysisContent';
import { AnalysisError } from '@/features/analysis/components/AnalysisError';
import { AnalysisLoading } from '@/features/analysis/components/AnalysisLoading';
import {
  BackChevronIcon,
  ShareIcon,
} from '@/features/analysis/components/AnalysisIcons';
import { MOCK_ANALYSIS, MOCK_SUBTITLE } from '@/features/analysis/mockAnalysis';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors, layout, spacing, typography } from '@/theme';

type AnalysisViewState = 'loading' | 'ready' | 'error';

// Representative retryable failure (AI_IMPLEMENTATION_GUIDE §11 invalid-
// response row). Real messages arrive with the hook in Phase 4.4.
const MOCK_ERROR_MESSAGE =
  'Something went wrong processing your analysis. Give it another go.';

export function AnalysisScreen({
  navigation,
}: RootStackScreenProps<'Analysis'>) {
  const insets = useSafeAreaInsets();
  // Seeded to the rich "ready" state for Phase 4.3 (mock data).
  const [state, setState] = useState<AnalysisViewState>('ready');

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRetry = useCallback(() => {
    // Phase 4.4: re-invoke the Edge Function. For now, return to the report.
    setState('ready');
  }, []);

  const handleShare = useCallback(() => {
    Share.share({
      message: `My swing scored ${MOCK_ANALYSIS.score}/100 on Caddie.\n\n${MOCK_ANALYSIS.summary}`,
    }).catch(() => {
      // User dismissed the share sheet — not an error.
    });
  }, []);

  const handleStartDrill = useCallback(() => {
    Toast.show({
      message: 'Guided drills are coming soon.',
      variant: 'info',
    });
  }, []);

  const devSwitcher = __DEV__ ? (
    <DevStateSwitcher state={state} onChange={setState} bottomInset={insets.bottom} />
  ) : null;

  if (state === 'loading') {
    return (
      <View style={styles.root}>
        <AnalysisLoading onClose={handleClose} />
        {devSwitcher}
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AnalysisHeader
        onBack={handleClose}
        onShare={state === 'ready' ? handleShare : undefined}
      />
      {state === 'error' ? (
        <AnalysisError message={MOCK_ERROR_MESSAGE} onRetry={handleRetry} />
      ) : (
        <AnalysisContent
          analysis={MOCK_ANALYSIS}
          subtitle={MOCK_SUBTITLE}
          onStartDrill={handleStartDrill}
        />
      )}
      {devSwitcher}
    </View>
  );
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

// ───── __DEV__ state switcher (compiled out of release) ────────────────────

interface DevStateSwitcherProps {
  state: AnalysisViewState;
  onChange: (next: AnalysisViewState) => void;
  bottomInset: number;
}

const DEV_STATES: readonly AnalysisViewState[] = ['ready', 'loading', 'error'];

function DevStateSwitcher({ state, onChange, bottomInset }: DevStateSwitcherProps) {
  return (
    <View style={[styles.devSwitcher, { bottom: bottomInset + spacing[2] }]}>
      {DEV_STATES.map(option => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          accessibilityRole="button"
          style={[styles.devChip, option === state && styles.devChipActive]}>
          <Text
            style={[
              styles.devChipText,
              option === state && styles.devChipTextActive,
            ]}>
            {option}
          </Text>
        </Pressable>
      ))}
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
  // Dev-only — never ships (wrapped in __DEV__ at the call site).
  devSwitcher: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing[1],
    padding: spacing[1],
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  devChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: layout.borderRadius.full,
  },
  devChipActive: {
    backgroundColor: colors.bg.input,
  },
  devChipText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  devChipTextActive: {
    color: colors.text.primary,
  },
});
