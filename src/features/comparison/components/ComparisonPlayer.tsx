/**
 * ComparisonPlayer — Feature component
 * The two-up comparison surface: two ComparePanels stacked vertically
 * (portrait), each an independent player. A thin divider separates them
 * (Phase 5.1b replaces it with the Sync strip). Landscape side-by-side is a
 * follow-up — see TODO.md.
 *
 * Composition only; panel state + handlers are passed through.
 *
 * Part of: src/features/comparison/
 */

import type { Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { ComparePanel } from '@/features/comparison/components/ComparePanel';
import type { VideoPlayerHandle } from '@/features/playback/components/VideoPlayer';
import type { ComparePanelState } from '@/features/comparison/types';
import { colors } from '@/theme';

interface ComparisonPlayerProps {
  panelA: ComparePanelState;
  panelB: ComparePanelState;
  playerRefA: Ref<VideoPlayerHandle>;
  playerRefB: Ref<VideoPlayerHandle>;
  onPickA: () => void;
  onPickB: () => void;
}

export function ComparisonPlayer({
  panelA,
  panelB,
  playerRefA,
  playerRefB,
  onPickA,
  onPickB,
}: ComparisonPlayerProps) {
  return (
    <View style={styles.root}>
      <ComparePanel
        panel={panelA}
        playerRef={playerRefA}
        onPick={onPickA}
        placeholder="Swing A"
      />
      <View style={styles.divider} />
      <ComparePanel
        panel={panelB}
        playerRef={playerRefB}
        onPick={onPickB}
        placeholder="Swing B"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.default,
  },
});
