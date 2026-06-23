/**
 * HomeScreen — Screen
 * The Home tab dashboard (PROJECT_SPEC §22 Phase 5.2, Design/Caddie
 * Screens.dc.html §01): greeting, stats row, latest swing, a Pro coaching
 * summary, and the quick-action grid.
 *
 * Composition only — all data comes from `useHomeDashboard`; Pro status from
 * `useSubscription`; the Import action reuses the library's `useImportVideo`
 * pipeline (same flow as LibraryScreen). Coaching is gated with `ProGate`
 * (the mandated gate doubles as the upsell for non-Pro users).
 *
 * States: loading → inline skeletons (quick actions stay live); initial-load
 * error → full-screen retry; a failed pull-to-refresh keeps the last data and
 * surfaces a Toast; empty (no swings) → a record-prompt placeholder.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, ProGate, Skeleton, Toast } from '@/components/ui';
import { ImportConfirmSheet } from '@/features/library/components/ImportConfirmSheet';
import type { ImportConfirmMetadata } from '@/features/library/components/ImportConfirmSheet';
import { useImportVideo } from '@/features/library/hooks/useImportVideo';
import { CameraIcon } from '@/features/home/components/HomeIcons';
import { HomeCoachingCard } from '@/features/home/components/HomeCoachingCard';
import { LatestSwingCard } from '@/features/home/components/LatestSwingCard';
import { QuickActions } from '@/features/home/components/QuickActions';
import { StatsRow } from '@/features/home/components/StatsRow';
import { useHomeDashboard } from '@/features/home/hooks/useHomeDashboard';
import { buildContextLine, buildGreetingHeadline } from '@/features/home/homeContent';
import { useSubscription } from '@/features/subscription/hooks/useSubscription';
import type { AppTabsScreenProps } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { colors, layout, spacing, typography } from '@/theme';

const STAT_SKELETON_KEYS = ['s0', 's1', 's2'];

export function HomeScreen({ navigation }: AppTabsScreenProps<'HomeTab'>) {
  const insets = useSafeAreaInsets();
  const dashboard = useHomeDashboard();
  const { isPro } = useSubscription();

  // Imported clips route to the PlaybackScreen for review / trim / Save
  // (same path as recordings); the upload happens there.
  const handleImportReview = useCallback(
    (uri: string, meta: ImportConfirmMetadata) => {
      navigation.navigate('Playback', {
        localUri: uri,
        angle: meta.angle,
        clubType: meta.club,
        swingHand: meta.swingHand,
      });
    },
    [navigation],
  );
  const importer = useImportVideo({ onReview: handleImportReview });

  // Refresh the dashboard on focus after the first mount so a swing saved
  // on the PlaybackScreen (recording or import) is reflected on return.
  const didMountRef = useRef(false);
  const refreshDashboard = dashboard.refresh;
  useFocusEffect(
    useCallback(() => {
      if (!didMountRef.current) {
        didMountRef.current = true;
        return;
      }
      refreshDashboard().catch(() => {
        // Errors surface via the dashboard's error state.
      });
    }, [refreshDashboard]),
  );

  // __DEV__-only Pro toggle so the coaching-vs-gate states are verifiable on
  // the simulator without a sandbox purchase (mirrors LibraryScreen's seed).
  const setIsPro = useAppStore(s => s.setIsPro);

  // Distinguish an initial-load failure (full-screen error) from a failed
  // pull-to-refresh (keep stale data, Toast instead).
  const [hasLoaded, setHasLoaded] = useState(false);
  useEffect(() => {
    if (!dashboard.isLoading && !dashboard.error) setHasLoaded(true);
  }, [dashboard.isLoading, dashboard.error]);
  useEffect(() => {
    if (dashboard.error && hasLoaded) {
      Toast.show({
        message: 'Could not refresh. Pull down to try again.',
        variant: 'error',
      });
    }
  }, [dashboard.error, hasLoaded]);

  const headline = buildGreetingHeadline(
    dashboard.greetingName,
    dashboard.featuredClub,
  );

  // ───── Handlers ──────────────────────────────────────────────────────────
  const handleRecord = useCallback(
    () => navigation.navigate('Camera'),
    [navigation],
  );
  const handleCompare = useCallback(
    () => navigation.navigate('Comparison'),
    [navigation],
  );
  const handleTempo = useCallback(
    () => navigation.navigate('TempoTab'),
    [navigation],
  );
  const handleProfile = useCallback(
    () => navigation.navigate('ProfileTab', { screen: 'Profile' }),
    [navigation],
  );
  const handleImport = useCallback(() => {
    importer.start().catch(() => {
      // Errors surface via the toast inside the hook.
    });
  }, [importer]);
  const handleRetry = useCallback(() => {
    dashboard.refresh().catch(() => {
      // Error re-surfaces via dashboard.error.
    });
  }, [dashboard]);

  const latest = dashboard.latestSwing;
  const handleOpenLatest = useCallback(() => {
    if (latest) navigation.navigate('Playback', { videoId: latest.videoId });
  }, [navigation, latest]);

  const showFullError = dashboard.error != null && !hasLoaded;
  const isLoading = dashboard.isLoading;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing[8] },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={dashboard.isRefreshing}
            onRefresh={dashboard.refresh}
            tintColor={colors.text.secondary}
          />
        }>
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.contextLine}>{buildContextLine()}</Text>
            {isLoading ? (
              <View style={styles.headlineSkeleton}>
                <Skeleton width="80%" height={26} borderRadius={8} />
              </View>
            ) : (
              <Text style={styles.headline}>{headline}</Text>
            )}
          </View>
          <Pressable
            onPress={handleProfile}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={8}>
            <Avatar
              name={dashboard.greetingName}
              source={
                dashboard.avatarUrl ? { uri: dashboard.avatarUrl } : undefined
              }
              size="md"
            />
          </Pressable>
        </View>

        {__DEV__ ? (
          <Pressable
            onPress={() => setIsPro(!isPro)}
            accessibilityRole="button"
            style={styles.devButton}>
            <Text style={styles.devButtonText}>
              DEV · Toggle Pro (now {String(isPro)})
            </Text>
          </Pressable>
        ) : null}

        {showFullError ? (
          <HomeErrorView onRetry={handleRetry} />
        ) : (
          <>
            {/* Stats */}
            {isLoading ? (
              <View style={styles.statsSkeletonRow}>
                {STAT_SKELETON_KEYS.map(key => (
                  <View key={key} style={styles.statsSkeletonCell}>
                    <Skeleton height={68} borderRadius={layout.borderRadius.lg} />
                  </View>
                ))}
              </View>
            ) : (
              <StatsRow
                swings={dashboard.stats.swings}
                analyses={dashboard.stats.analyses}
                streakDays={dashboard.stats.streakDays}
              />
            )}

            {/* Latest swing */}
            <Text style={styles.sectionLabel}>Latest swing</Text>
            {isLoading ? (
              <Skeleton height={200} borderRadius={layout.borderRadius.xl} />
            ) : latest ? (
              <LatestSwingCard swing={latest} onPress={handleOpenLatest} />
            ) : (
              <LatestSwingEmpty onPress={handleRecord} />
            )}

            {/* Coaching (Pro only; gate doubles as upsell) */}
            {!isLoading ? (
              <CoachingSection isPro={isPro} dashboard={dashboard} />
            ) : null}

            {/* Quick actions */}
            <Text style={styles.sectionLabel}>Jump back in</Text>
            <QuickActions
              onRecord={handleRecord}
              onImport={handleImport}
              onCompare={handleCompare}
              onTempo={handleTempo}
            />
          </>
        )}
      </ScrollView>

      <ImportConfirmSheet
        visible={importer.sheet.visible}
        defaultClub={importer.sheet.defaultClub}
        onConfirm={importer.sheet.onConfirm}
        onDismiss={importer.sheet.onDismiss}
      />

      {importer.isProcessing && !importer.sheet.visible ? (
        <ImportProcessingOverlay />
      ) : null}
    </View>
  );
}

// ───── Coaching section ────────────────────────────────────────────────────
// Pro + coaching → the quote card. Not Pro → ProGate (the mandated gate, which
// doubles as the upsell). Pro + no analysis yet → nothing.

interface CoachingSectionProps {
  isPro: boolean;
  dashboard: ReturnType<typeof useHomeDashboard>;
}

function CoachingSection({ isPro, dashboard }: CoachingSectionProps) {
  if (isPro) {
    if (!dashboard.coaching) return null;
    return (
      <>
        <Text style={styles.sectionLabel}>From your last session</Text>
        <HomeCoachingCard
          text={dashboard.coaching.text}
          spanCount={dashboard.coaching.spanCount}
        />
      </>
    );
  }
  return (
    <>
      <Text style={styles.sectionLabel}>Coaching</Text>
      <ProGate feature="AI Coaching" />
    </>
  );
}

// ───── Empty latest-swing placeholder ──────────────────────────────────────

function LatestSwingEmpty({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Record your first swing"
      style={styles.emptyLatest}>
      <View style={styles.emptyLatestIcon}>
        <CameraIcon size={22} color={colors.text.secondary} />
      </View>
      <Text style={styles.emptyLatestTitle}>No swings yet</Text>
      <Text style={styles.emptyLatestBody}>
        Record your first swing to see it here.
      </Text>
    </Pressable>
  );
}

// ───── Initial-load error ──────────────────────────────────────────────────

function HomeErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorTitle}>Couldn’t load your dashboard</Text>
      <Text style={styles.errorBody}>
        Check your connection and try again.
      </Text>
      <View style={styles.errorCta}>
        <Button label="Try again" onPress={onRetry} variant="primary" />
      </View>
    </View>
  );
}

// ───── Import-in-progress overlay (mirrors LibraryScreen) ──────────────────

function ImportProcessingOverlay() {
  return (
    <View style={styles.processingRoot} pointerEvents="auto">
      <View style={styles.processingCard}>
        <ActivityIndicator color={colors.gold.default} />
        <Text style={styles.processingLabel}>Preparing video…</Text>
      </View>
    </View>
  );
}

// ───── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[2],
  },
  // Greeting
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing[1],
    gap: spacing[3],
  },
  greetingText: {
    flex: 1,
    minWidth: 0,
  },
  contextLine: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    color: colors.text.secondary,
  },
  headline: {
    ...typography.display,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.6,
    marginTop: spacing[1],
  },
  headlineSkeleton: {
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  // Dev
  devButton: {
    marginTop: spacing[4],
    height: 32,
    paddingHorizontal: spacing[3],
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  devButtonText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  // Stats skeleton
  statsSkeletonRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  statsSkeletonCell: {
    flex: 1,
  },
  // Section labels
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    color: colors.text.secondary,
    marginTop: spacing[6],
    marginBottom: spacing[3],
    marginLeft: spacing[0.5],
  },
  // Empty latest swing
  emptyLatest: {
    height: 160,
    borderRadius: layout.borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  emptyLatestIcon: {
    width: 44,
    height: 44,
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.bg.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  emptyLatestTitle: {
    ...typography.title3,
  },
  emptyLatestBody: {
    ...typography.label,
    color: colors.text.tertiary,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  // Error
  errorWrap: {
    marginTop: spacing[16],
    alignItems: 'center',
    paddingHorizontal: spacing[6],
  },
  errorTitle: {
    ...typography.title2,
    textAlign: 'center',
  },
  errorBody: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  errorCta: {
    marginTop: spacing[5],
  },
  // Import overlay
  processingRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,10,0.55)',
  },
  processingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  processingLabel: {
    ...typography.body,
    color: colors.text.primary,
  },
});
