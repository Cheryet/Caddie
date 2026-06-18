/**
 * ComparisonPlayer — Feature component
 * The two-up comparison surface: two ComparePanels stacked vertically
 * (portrait), each an independent player, with the Sync strip between them
 * (Phase 5.1b). Landscape side-by-side is a follow-up — see TODO.md.
 *
 * Composition only; panel state + handlers are passed through.
 *
 * Part of: src/features/comparison/
 */

import type { Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { ComparePanel } from '@/features/comparison/components/ComparePanel';
import { SyncStrip } from '@/features/comparison/components/SyncStrip';
import type { VideoPlayerHandle } from '@/features/playback/components/VideoPlayer';
import type { ComparePanelState } from '@/features/comparison/types';

interface ComparisonPlayerProps {
  panelA: ComparePanelState;
  panelB: ComparePanelState;
  playerRefA: Ref<VideoPlayerHandle>;
  playerRefB: Ref<VideoPlayerHandle>;
  onPickA: () => void;
  onPickB: () => void;
  syncOn: boolean;
  canSync: boolean;
  onToggleSync: () => void;
}

export function ComparisonPlayer({
  panelA,
  panelB,
  playerRefA,
  playerRefB,
  onPickA,
  onPickB,
  syncOn,
  canSync,
  onToggleSync,
}: ComparisonPlayerProps) {
  return (
    <View style={styles.root}>
      <ComparePanel
        panel={panelA}
        playerRef={playerRefA}
        onPick={onPickA}
        placeholder="Swing A"
      />
      <SyncStrip syncOn={syncOn} canSync={canSync} onToggle={onToggleSync} />
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
});
