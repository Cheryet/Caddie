/**
 * TempoScreen — Screen
 * The Tempo tab metronome trainer (PROJECT_SPEC §22 Phase 5.3 / Design §07):
 * header with a tempo-term pill, the metronome dial, the play/± transport,
 * four presets, and the static 3:1 tour-tempo guide.
 *
 * Composition only — all state/behaviour lives in `useTempo`. The transport
 * and the 3:1 guide are local sub-components (handler-thin / static), like
 * HomeScreen's local helpers.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Metronome } from '@/features/tempo/components/Metronome';
import { PresetRow } from '@/features/tempo/components/PresetRow';
import {
  ClockIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
} from '@/features/tempo/components/TempoIcons';
import { useTempo } from '@/features/tempo/hooks/useTempo';
import { tempoTerm } from '@/features/tempo/tempoContent';
import { colors, layout, spacing, typography } from '@/theme';

export function TempoScreen() {
  const insets = useSafeAreaInsets();
  const tempo = useTempo();
  const term = tempoTerm(tempo.bpm);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Tempo</Text>
        <View style={styles.termPill}>
          <Text style={styles.termText}>{term}</Text>
        </View>
      </View>

      <View style={styles.metronomeWrap}>
        <Metronome
          bpm={tempo.bpm}
          isPlaying={tempo.isPlaying}
          beatDurationMs={tempo.beatDurationMs}
        />
      </View>

      <Transport
        isPlaying={tempo.isPlaying}
        onToggle={tempo.togglePlay}
        onHoldStart={tempo.holdStart}
        onHoldStop={tempo.holdStop}
      />

      <View style={styles.spacer} />

      <View>
        <View style={styles.presetsHeader}>
          <Text style={styles.presetsTitle}>Presets</Text>
          <Text style={styles.presetsHint}>Long-press to save</Text>
        </View>
        <PresetRow
          presets={tempo.presets}
          bpm={tempo.bpm}
          savedSlot={tempo.savedSlot}
          onSlotDown={tempo.presetDown}
          onSlotUp={tempo.presetUp}
        />
      </View>

      <TourTempoGuide />
    </View>
  );
}

// ───── Transport ───────────────────────────────────────────────────────────

interface TransportProps {
  isPlaying: boolean;
  onToggle: () => void;
  onHoldStart: (delta: number) => void;
  onHoldStop: () => void;
}

function Transport({
  isPlaying,
  onToggle,
  onHoldStart,
  onHoldStop,
}: TransportProps) {
  return (
    <View style={styles.transport}>
      <Pressable
        onPressIn={() => onHoldStart(-1)}
        onPressOut={onHoldStop}
        accessibilityRole="button"
        accessibilityLabel="Decrease tempo"
        style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}>
        <MinusIcon />
      </Pressable>

      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Stop metronome' : 'Start metronome'}
        style={({ pressed }) => [styles.play, pressed && styles.playPressed]}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </Pressable>

      <Pressable
        onPressIn={() => onHoldStart(1)}
        onPressOut={onHoldStop}
        accessibilityRole="button"
        accessibilityLabel="Increase tempo"
        style={({ pressed }) => [styles.step, pressed && styles.stepPressed]}>
        <PlusIcon />
      </Pressable>
    </View>
  );
}

// ───── 3:1 tour-tempo guide (static) ────────────────────────────────────────

function TourTempoGuide() {
  return (
    <View style={styles.guide}>
      <View style={styles.guideHeader}>
        <ClockIcon />
        <Text style={styles.guideTitle}>Tour average tempo</Text>
        <Text style={styles.guideRatio}>3 : 1</Text>
      </View>
      <View style={styles.guideBar}>
        <View style={styles.guideBarFront} />
        <View style={styles.guideBarBack} />
      </View>
      <View style={styles.guideLabels}>
        <Text style={styles.guideLabel}>Backswing — 3 beats</Text>
        <Text style={styles.guideLabel}>Downswing — 1</Text>
      </View>
    </View>
  );
}

// ───── Styles ────────────────────────────────────────────────────────────────

const STEP = 56;
const PLAY = 78;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
    paddingHorizontal: layout.screenPaddingH,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[2],
  },
  title: {
    ...typography.display,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  termPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: spacing[3],
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  termText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: colors.text.secondary,
  },
  metronomeWrap: {
    alignItems: 'center',
    paddingTop: spacing[5],
    paddingBottom: spacing[2],
  },
  // Transport
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[6],
    paddingTop: spacing[1],
  },
  step: {
    width: STEP,
    height: STEP,
    borderRadius: STEP / 2,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPressed: {
    backgroundColor: colors.bg.input,
  },
  play: {
    width: PLAY,
    height: PLAY,
    borderRadius: PLAY / 2,
    backgroundColor: colors.gold.default,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold.default,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  playPressed: {
    backgroundColor: colors.gold.bright,
  },
  spacer: {
    flex: 1,
  },
  // Presets
  presetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  presetsTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    color: colors.text.secondary,
  },
  presetsHint: {
    ...typography.caption,
  },
  // 3:1 guide
  guide: {
    marginTop: spacing[4],
    marginBottom: spacing[2],
    padding: spacing[4],
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  guideRatio: {
    ...typography.dataSmall,
    marginLeft: 'auto',
    fontSize: 14,
    color: colors.gold.default,
  },
  guideBar: {
    flexDirection: 'row',
    height: 10,
    gap: 4,
  },
  guideBarFront: {
    flex: 3,
    backgroundColor: colors.gold.default,
    borderRadius: 4,
  },
  guideBarBack: {
    flex: 1,
    backgroundColor: colors.border.default,
    borderRadius: 4,
  },
  guideLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[2],
  },
  guideLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
});
