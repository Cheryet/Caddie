/**
 * LatestSwingCard — Feature component
 * The latest-swing hero on HomeScreen (Design/Caddie Screens.dc.html §01,
 * lines 78–91): a 200px thumbnail with a darkening scrim, a green "Analysed"
 * pill, a play affordance, and a footer pairing the swing label with its
 * score in the score's bracket colour.
 *
 * The score colour reuses `scoreBracket` so it matches AnalysisScreen. The
 * scrim is a solid approximation of the design's linear-gradient, consistent
 * with PlaybackChrome/ComparePanel (the project intentionally ships no
 * gradient dependency). The prototype's flavour subline ("Best tempo all
 * week") is replaced with the real camera angle, since it isn't derivable.
 *
 * Presentational only — receives the swing via props.
 * Part of: src/features/home/
 */

import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PlayIcon } from '@/features/home/components/HomeIcons';
import { scoreBracket } from '@/features/analysis/scoreBracket';
import type { HomeLatestSwing } from '@/features/home/hooks/useHomeDashboard';
import { colors, layout, spacing, typography } from '@/theme';

interface LatestSwingCardProps {
  swing: HomeLatestSwing;
  onPress: () => void;
}

export function LatestSwingCard({ swing, onPress }: LatestSwingCardProps) {
  const bracketColor = useMemo(
    () => (swing.score != null ? scoreBracket(swing.score).color : null),
    [swing.score],
  );

  const titleLine = swing.relativeDate
    ? `${swing.club} · ${swing.relativeDate}`
    : swing.club;
  const a11yLabel =
    `${titleLine}` + (swing.score != null ? `, score ${swing.score}` : '');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={styles.card}>
      {swing.thumbnailUrl ? (
        <Image
          source={{ uri: swing.thumbnailUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.imageFallback]} />
      )}

      {/* Solid scrim approximation of the design gradient (no gradient dep). */}
      <View style={styles.tint} pointerEvents="none" />
      <View style={styles.bottomScrim} pointerEvents="none" />

      {swing.hasAnalysis ? (
        <View style={styles.analysedPill}>
          <View style={styles.analysedDot} />
          <Text style={styles.analysedText}>Analysed</Text>
        </View>
      ) : null}

      <View style={styles.playButton} pointerEvents="none">
        <PlayIcon size={17} color={colors.text.primary} />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerText}>
          <Text style={styles.title} numberOfLines={1}>
            {titleLine}
          </Text>
          {swing.cameraAngleLabel ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {swing.cameraAngleLabel}
            </Text>
          ) : null}
        </View>

        {swing.score != null && bracketColor ? (
          <View style={styles.scoreBlock}>
            <Text
              style={[styles.score, { color: bracketColor }]}
              allowFontScaling={false}>
              {swing.score}
            </Text>
            <Text style={styles.scoreLabel}>score</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// On-image text/colour literals follow the PlaybackChrome/VideoCard precedent
// (warm-white at alpha over video stills; the success green mirrors VideoCard).
const ON_IMAGE_DIM = 'rgba(240,237,232,0.65)';
const ON_IMAGE_FAINT = 'rgba(240,237,232,0.5)';

const styles = StyleSheet.create({
  card: {
    height: 200,
    borderRadius: layout.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.elevated,
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageFallback: {
    backgroundColor: colors.bg.elevated,
  },
  tint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  bottomScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '65%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  analysedPill: {
    position: 'absolute',
    top: 13,
    left: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: layout.borderRadius.full,
    backgroundColor: 'rgba(10,10,10,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(109,201,138,0.3)',
  },
  analysedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.semantic.success,
  },
  analysedText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.semantic.success,
  },
  playButton: {
    position: 'absolute',
    top: 13,
    right: 13,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10,10,10,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerText: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing[2],
  },
  title: {
    ...typography.title2,
  },
  subtitle: {
    fontSize: 13,
    color: ON_IMAGE_DIM,
    marginTop: 3,
  },
  scoreBlock: {
    alignItems: 'center',
    flexShrink: 0,
  },
  score: {
    ...typography.data,
    fontSize: 30,
    lineHeight: 30,
  },
  scoreLabel: {
    ...typography.overline,
    fontSize: 10,
    letterSpacing: 0.8,
    color: ON_IMAGE_FAINT,
    marginTop: 3,
  },
});
