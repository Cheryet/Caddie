/**
 * Metronome — Feature component
 * The 244px metronome dial (Design §07, prototype L1904–1917): the expanding
 * PulseRing beats behind a static track ring and a dark core that shows the
 * current BPM and glows gold while playing.
 *
 * Presentational — BPM/play state come from useTempo via props. The design's
 * radial-gradient core is approximated with a solid surface (no gradient dep,
 * consistent with the rest of the app).
 *
 * Part of: src/features/tempo/
 */

import { StyleSheet, Text, View } from 'react-native';

import { PulseRing } from '@/features/tempo/components/PulseRing';
import { colors, typography } from '@/theme';

interface MetronomeProps {
  bpm: number;
  isPlaying: boolean;
  beatDurationMs: number;
}

export function Metronome({ bpm, isPlaying, beatDurationMs }: MetronomeProps) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel={`${bpm} beats per minute${isPlaying ? ', playing' : ''}`}>
      <PulseRing playing={isPlaying} beatDurationMs={beatDurationMs} />
      <View style={styles.track} pointerEvents="none" />
      <View
        style={[styles.core, isPlaying && styles.corePlaying]}
        pointerEvents="none">
        <Text style={styles.bpm} allowFontScaling={false}>
          {bpm}
        </Text>
        <Text style={styles.bpmLabel}>BPM</Text>
      </View>
    </View>
  );
}

const DIAL = 244;

const styles = StyleSheet.create({
  wrap: {
    width: DIAL,
    height: DIAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  core: {
    position: 'absolute',
    top: 38,
    left: 38,
    right: 38,
    bottom: 38,
    borderRadius: 999,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corePlaying: {
    // Gold glow while running (design boxShadow approximation).
    shadowColor: colors.gold.default,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 23,
  },
  bpm: {
    ...typography.data,
    fontSize: 70,
    lineHeight: 74,
    letterSpacing: -4,
  },
  bpmLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: colors.text.secondary,
    marginTop: 4,
  },
});
