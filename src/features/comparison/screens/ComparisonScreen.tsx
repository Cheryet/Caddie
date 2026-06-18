/**
 * ComparisonScreen — Screen
 * Side-by-side swing comparison, presented as a full-screen modal (PROJECT_
 * SPEC §22 5.1). Two stacked panels (portrait), each an independent player;
 * empty slots open a library picker. The session is ephemeral — slot choices
 * live only in useComparison.
 *
 * Phase 5.1a: pick two swings + independent playback/scrub/speed. Sync +
 * impact-marking + per-panel pose land in 5.1b; landscape side-by-side is a
 * follow-up (TODO.md).
 */

import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';

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

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);
  const handlePickA = useCallback(() => openPicker('A'), [openPicker]);
  const handlePickB = useCallback(() => openPicker('B'), [openPicker]);

  // Don't offer the other slot's video in the picker.
  const excludeVideoId = pickerOpenFor === 'A' ? panelB.videoId : panelA.videoId;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close comparison"
          style={styles.headerButton}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Polyline
              points="15 5 8 12 15 19"
              stroke={colors.text.primary}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <Text style={styles.headerTitle}>Compare</Text>
        <View style={styles.headerButton} />
      </View>

      <ComparisonPlayer
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

      <ComparisonPickerSheet
        visible={pickerOpenFor !== null}
        onChoose={chooseVideo}
        onDismiss={closePicker}
        excludeVideoId={excludeVideoId}
      />
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
});
