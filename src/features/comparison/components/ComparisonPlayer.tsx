/**
 * ComparisonPlayer — Feature component
 * The two-up comparison surface, responsive to orientation (Phase 5.1c):
 *   - portrait: panels stacked with the Sync strip between them.
 *   - landscape (the Design's primary layout): panels side by side with a
 *     faint amber center axis (the impact-aligned divider) and the Sync
 *     control floating top-center.
 *
 * Composition only; panel state + handlers are passed through.
 *
 * Part of: src/features/comparison/
 */

import type { Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComparePanel } from '@/features/comparison/components/ComparePanel';
import { SyncStrip } from '@/features/comparison/components/SyncStrip';
import { SyncToggle } from '@/features/comparison/components/SyncToggle';
import type { VideoPlayerHandle } from '@/features/playback/components/VideoPlayer';
import type { ComparePanelState } from '@/features/comparison/types';
import { spacing } from '@/theme';

export type ComparisonLayout = 'portrait' | 'landscape';

interface ComparisonPlayerProps {
  layout: ComparisonLayout;
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

// Faint amber center axis = semantic.warning (#C47D2A) at 30%, matching the
// scrub impact tick. Kept as a local overlay constant like this feature's
// other chrome colors (see TODO.md re: promoting amber-alpha to a token).
const IMPACT_LINE = 'rgba(196,125,42,0.3)';

export function ComparisonPlayer({
  layout,
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
  const insets = useSafeAreaInsets();

  if (layout === 'landscape') {
    return (
      <View style={styles.rootRow}>
        <ComparePanel
          panel={panelA}
          playerRef={playerRefA}
          onPick={onPickA}
          placeholder="Swing A"
          landscape
          clusterSide="left"
        />
        <ComparePanel
          panel={panelB}
          playerRef={playerRefB}
          onPick={onPickB}
          placeholder="Swing B"
          landscape
          clusterSide="right"
        />
        <View style={styles.impactLine} pointerEvents="none" />
        <View
          style={[styles.syncFloat, { top: insets.top + spacing[2] }]}
          pointerEvents="box-none">
          <SyncToggle
            variant="floating"
            syncOn={syncOn}
            canSync={canSync}
            onToggle={onToggleSync}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.rootColumn}>
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
  rootColumn: {
    flex: 1,
  },
  rootRow: {
    flex: 1,
    flexDirection: 'row',
  },
  impactLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    marginLeft: -0.5,
    backgroundColor: IMPACT_LINE,
  },
  syncFloat: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
