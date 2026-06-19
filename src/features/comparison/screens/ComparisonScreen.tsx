/**
 * ComparisonScreen — Screen
 * Side-by-side swing comparison, presented as a full-screen modal (PROJECT_
 * SPEC §22 5.1). Two players, each independent; empty slots open a library
 * picker. The session is ephemeral — slot choices live only in useComparison.
 *
 * Orientation-aware (Phase 5.1c): portrait stacks the panels under a title
 * header; landscape (the Design's primary layout) is side-by-side with a
 * floating back button. The screen unlocks rotation on focus and re-locks
 * portrait on blur (the rest of the app is portrait-only).
 */

import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Polyline } from 'react-native-svg';

import { lockPortrait, unlockOrientation } from '@/core/orientation';
import { ComparisonPickerSheet } from '@/features/comparison/components/ComparisonPickerSheet';
import { ComparisonPlayer } from '@/features/comparison/components/ComparisonPlayer';
import { useComparison } from '@/features/comparison/hooks/useComparison';
import type { RootStackScreenProps } from '@/navigation/types';
import { colors, spacing, typography } from '@/theme';

export function ComparisonScreen({
  navigation,
  route,
}: RootStackScreenProps<'Comparison'>) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const {
    panelA,
    panelB,
    playerRefA,
    playerRefB,
    pickerOpenFor,
    openPicker,
    closePicker,
    chooseVideo,
    syncOn,
    canSync,
    toggleSync,
  } = useComparison({
    initialVideoIdA: route.params?.videoIdA,
    initialVideoIdB: route.params?.videoIdB,
  });

  // Comparison is the one screen that goes landscape (the design's primary
  // layout). Allow rotation while it's focused; re-lock portrait on the way
  // out so the rest of the app stays portrait. (Phase 5.1c.)
  useFocusEffect(
    useCallback(() => {
      unlockOrientation();
      return () => lockPortrait();
    }, []),
  );

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);
  const handlePickA = useCallback(() => openPicker('A'), [openPicker]);
  const handlePickB = useCallback(() => openPicker('B'), [openPicker]);

  // Don't offer the other slot's video in the picker.
  const excludeVideoId = pickerOpenFor === 'A' ? panelB.videoId : panelA.videoId;

  return (
    <View style={styles.root}>
      {isLandscape ? null : (
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close comparison"
            style={styles.headerButton}>
            <BackChevron />
          </Pressable>
          <Text style={styles.headerTitle}>Compare</Text>
          <View style={styles.headerButton} />
        </View>
      )}

      <ComparisonPlayer
        layout={isLandscape ? 'landscape' : 'portrait'}
        panelA={panelA}
        panelB={panelB}
        playerRefA={playerRefA}
        playerRefB={playerRefB}
        onPickA={handlePickA}
        onPickB={handlePickB}
        syncOn={syncOn}
        canSync={canSync}
        onToggleSync={toggleSync}
      />

      {isLandscape ? (
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close comparison"
          hitSlop={8}
          style={[
            styles.floatingBack,
            { top: insets.top + spacing[2], left: insets.left + spacing[3] },
          ]}>
          <BackChevron />
        </Pressable>
      ) : null}

      <ComparisonPickerSheet
        visible={pickerOpenFor !== null}
        onChoose={chooseVideo}
        onDismiss={closePicker}
        excludeVideoId={excludeVideoId}
      />
    </View>
  );
}

function BackChevron() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="15 5 8 12 15 19"
        stroke={colors.text.primary}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const FLOATING_BACK_BG = 'rgba(20,20,20,0.55)';
const FLOATING_BACK_BORDER = 'rgba(255,255,255,0.1)';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[1],
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
  floatingBack: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FLOATING_BACK_BG,
    borderWidth: 1,
    borderColor: FLOATING_BACK_BORDER,
  },
});
