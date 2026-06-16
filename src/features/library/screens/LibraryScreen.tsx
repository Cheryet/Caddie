/**
 * LibraryScreen — Screen
 * The "Your swings" grid. Mirrors Caddie Screens.dc.html §04 (default,
 * loading, empty). Per PROJECT_SPEC.md §22 Phase 1.5: 2-col virtualized
 * grid, pull-to-refresh, skeleton loading, empty state with record CTA.
 *
 * Search input + filter chips + "Processing N swings…" banner are
 * intentionally deferred to later phases (TODO.md tracks them) so this
 * phase ships small.
 *
 * Tap behaviour:
 *   "+" (header)            → ActionSheetIOS → Camera (record) | start
 *                              import-from-photos flow (Phase 1.6)
 *   VideoCard               → navigation.navigate('Playback', {videoId})
 *   Empty-state primary CTA → Camera
 *   Empty-state secondary   → start import-from-photos flow
 *   __DEV__ "Seed test row" → inserts a fake videos row so the grid is
 *                              exercisable on the simulator without
 *                              actual recording. Compiled out in release.
 */

import { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button, Toast } from '@/components/ui';
import { supabase } from '@/core/supabase/client';
import { DeleteConfirmSheet } from '@/features/library/components/DeleteConfirmSheet';
import { EditVideoSheet } from '@/features/library/components/EditVideoSheet';
import { ImportConfirmSheet } from '@/features/library/components/ImportConfirmSheet';
import { VideoCard } from '@/features/library/components/VideoCard';
import { LibrarySkeletonCard } from '@/features/library/components/LibrarySkeletonCard';
import { useImportVideo } from '@/features/library/hooks/useImportVideo';
import { useVideoManagement } from '@/features/library/hooks/useVideoManagement';
import { useVideos, type Video } from '@/features/library/hooks/useVideos';
import type { LibraryStackScreenProps } from '@/navigation/types';
import { useAppStore } from '@/store/useAppStore';
import { colors, layout, spacing, typography } from '@/theme';

// ───── Constants ─────────────────────────────────────────────────────────

const NUM_COLUMNS = 2;
const SKELETON_COUNT = 6;
const COLUMN_GAP = spacing[3]; // 12 — matches design
const SKELETON_KEYS = Array.from({ length: SKELETON_COUNT }, (_, i) => `sk-${i}`);

// ───── Screen ────────────────────────────────────────────────────────────

export function LibraryScreen({
  navigation,
}: LibraryStackScreenProps<'Library'>) {
  const insets = useSafeAreaInsets();
  const userId = useAppStore(s => s.user?.id ?? null);
  const { videos, isLoading, isRefreshing, error, refresh } = useVideos();
  const [isSeeding, setIsSeeding] = useState(false);
  const importer = useImportVideo({ onUploadComplete: refresh });
  const management = useVideoManagement({ onMutationComplete: refresh });

  const openCamera = useCallback(() => {
    navigation.navigate('Camera');
  }, [navigation]);

  const startImport = useCallback(() => {
    importer.start().catch(() => {
      // Errors surface through the toast inside the hook; nothing to do.
    });
  }, [importer]);

  const onPressAdd = useCallback(() => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Record swing', 'Import from photos', 'Cancel'],
        cancelButtonIndex: 2,
        userInterfaceStyle: 'dark',
      },
      index => {
        if (index === 0) openCamera();
        if (index === 1) startImport();
      },
    );
  }, [openCamera, startImport]);

  const onPressCard = useCallback(
    (video: Video) => {
      navigation.navigate('Playback', { videoId: video.id });
    },
    [navigation],
  );

  const onLongPressCard = useCallback(
    (video: Video) => {
      management.start(video);
    },
    [management],
  );

  const onPressSeed = useCallback(async () => {
    if (!userId || isSeeding) return;
    setIsSeeding(true);
    const ts = Date.now();
    const fakeId = `dev-seed-${ts}`;
    const clubType = '7 Iron';
    const { error: insertErr } = await supabase.from('videos').insert({
      id: fakeId,
      user_id: userId,
      // Default title mirrors the production upload path
      // (src/utils/upload.ts) — just the club name; the date is
      // rendered below on the card.
      title: clubType,
      storage_path: `${userId}/${fakeId}.mp4`,
      thumbnail_path: null,
      club_type: clubType,
      camera_angle: 'face-on',
      swing_hand: 'right',
      duration_ms: 4200,
      has_analysis: false,
    });
    setIsSeeding(false);
    if (insertErr) {
      Toast.show({ message: `Seed failed: ${insertErr.message}`, variant: 'error' });
      return;
    }
    Toast.show({ message: 'Seeded test row.', variant: 'success' });
    await refresh();
  }, [userId, isSeeding, refresh]);

  // ───── Body branches ───────────────────────────────────────────────────

  const showInitialSkeleton = isLoading && !videos;
  const showEmpty =
    !isLoading && !error && videos !== null && videos.length === 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Your swings</Text>
        <Pressable
          accessibilityLabel="Add swing"
          accessibilityRole="button"
          onPress={onPressAdd}
          style={styles.headerButton}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
              d="M12 5v14M5 12h14"
              stroke={colors.text.primary}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      </View>

      {__DEV__ ? (
        <View style={styles.devRow}>
          <Pressable
            onPress={onPressSeed}
            accessibilityRole="button"
            accessibilityLabel="Seed test video"
            style={styles.devButton}
            disabled={isSeeding || !userId}
          >
            <Text style={styles.devButtonText}>
              {isSeeding ? 'Seeding…' : 'DEV · Seed test row'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {showInitialSkeleton ? (
        <SkeletonGrid />
      ) : showEmpty ? (
        <LibraryEmpty
          onRecord={openCamera}
          onImport={startImport}
          bottomInset={insets.bottom}
        />
      ) : (
        <FlashList
          data={videos ?? []}
          keyExtractor={item => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={{
            paddingHorizontal: layout.screenPaddingH,
            paddingTop: spacing[1],
            paddingBottom: insets.bottom + spacing[5],
          }}
          refreshing={isRefreshing}
          onRefresh={refresh}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.cell,
                // First column gets full right gap; second column gets none.
                index % NUM_COLUMNS === 0
                  ? { paddingRight: COLUMN_GAP / 2 }
                  : { paddingLeft: COLUMN_GAP / 2 },
                { paddingBottom: COLUMN_GAP },
              ]}
            >
              <VideoCard
                video={item}
                onPress={onPressCard}
                onLongPress={onLongPressCard}
              />
            </View>
          )}
        />
      )}

      <ImportConfirmSheet
        visible={importer.sheet.visible}
        defaultClub={importer.sheet.defaultClub}
        isUploading={importer.sheet.isUploading}
        onConfirm={importer.sheet.onConfirm}
        onDismiss={importer.sheet.onDismiss}
      />

      <EditVideoSheet
        video={management.editSheet.video}
        isSaving={management.editSheet.isSaving}
        onSave={management.editSheet.onSave}
        onDismiss={management.editSheet.onDismiss}
      />

      <DeleteConfirmSheet
        video={management.deleteSheet.video}
        isDeleting={management.deleteSheet.isDeleting}
        onConfirm={management.deleteSheet.onConfirm}
        onDismiss={management.deleteSheet.onDismiss}
      />

      {importer.isProcessing && !importer.sheet.visible ? (
        <ImportProcessingOverlay />
      ) : null}
    </View>
  );
}

// ───── Import-in-progress overlay ────────────────────────────────────────
// Absolute-positioned View (NOT a Modal) so it lives inside the
// LibraryScreen view tree. PHPicker presents above the entire RN root
// as a native UIViewController — using a Modal here would race iOS's
// present-controller call and block the picker from opening. With a
// plain View, PHPicker simply covers the overlay while it's on screen
// and uncovers it the moment it dismisses, instantly filling the
// asset-copy gap.

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

// ───── Skeleton grid ─────────────────────────────────────────────────────
// Plain ScrollView (not FlashList) because we have a fixed count and
// don't need virtualization; this is also one fewer mock surface in tests.

function SkeletonGrid() {
  return (
    <ScrollView
      contentContainerStyle={styles.skeletonScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.skeletonGrid}>
        {SKELETON_KEYS.map((key, i) => (
          <View
            key={key}
            style={[
              styles.cell,
              i % NUM_COLUMNS === 0
                ? { paddingRight: COLUMN_GAP / 2 }
                : { paddingLeft: COLUMN_GAP / 2 },
              { paddingBottom: COLUMN_GAP },
            ]}
          >
            <LibrarySkeletonCard />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ───── Empty state ───────────────────────────────────────────────────────
// Bespoke layout matching Caddie Screens.dc.html §04 "LibraryScreen ·
// empty" — the shared `EmptyState` primitive uses SF Symbols, but the
// design specifies a custom illustration (video icon + gold "+" badge)
// so we render it inline here. Copy is the design's golfer-voice line.

interface LibraryEmptyProps {
  onRecord: () => void;
  onImport: () => void;
  bottomInset: number;
}

function LibraryEmpty({ onRecord, onImport, bottomInset }: LibraryEmptyProps) {
  return (
    <View
      style={[
        styles.emptyContainer,
        { paddingBottom: bottomInset + spacing[10] },
      ]}
    >
      <View style={styles.emptyTile}>
        <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 7.5a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
            stroke={colors.border.strong}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M10 11.5l5 2.5-5 2.5z"
            fill={colors.border.strong}
          />
        </Svg>
        <View style={styles.emptyPlusBadge}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M12 6v12M6 12h12"
              stroke={colors.text.inverse}
              strokeWidth={2.6}
              strokeLinecap="round"
            />
          </Svg>
        </View>
      </View>

      <Text style={styles.emptyTitle}>No swings on the books yet</Text>
      <Text style={styles.emptyBody}>
        Film one swing — face-on works best to start — and I’ll tell you the
        first thing I’d change.
      </Text>

      <View style={styles.emptyCta}>
        <Button
          label="Record your first swing"
          onPress={onRecord}
          variant="primary"
          size="lg"
          shadow
          icon={
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Circle
                cx={12}
                cy={13}
                r={3.5}
                stroke={colors.text.inverse}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M4 8.5a2 2 0 0 1 2-2h1.2l1-1.6h5.6l1 1.6H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"
                stroke={colors.text.inverse}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          }
        />
      </View>

      <Pressable
        onPress={onImport}
        accessibilityRole="button"
        style={styles.emptyImportLink}
      >
        <Text style={styles.emptyImportText}>or import from your camera roll</Text>
      </Pressable>
    </View>
  );
}

// ───── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  // Header
  headerRow: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...typography.display,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dev seed
  devRow: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing[2],
  },
  devButton: {
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
  // Grid cell
  cell: {
    flex: 1 / NUM_COLUMNS,
  },
  // Skeleton
  skeletonScroll: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[1],
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[10],
  },
  emptyTile: {
    width: 120,
    height: 120,
    marginBottom: spacing[6] + 2,
    borderRadius: 28,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlusBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gold.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text.secondary,
    marginTop: spacing[2] + 2,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyCta: {
    marginTop: spacing[6] + 2,
  },
  emptyImportLink: {
    marginTop: spacing[4],
  },
  emptyImportText: {
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  // Import processing overlay — absolute fill inside LibraryScreen
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
