/**
 * DrillCard — Feature component
 * The recommended drill for the swing's biggest fault. Layout verbatim from
 * Design/Caddie Screens.dc.html §03 (lines 536–540): a thumbnail tile, the
 * drill name + detail, and a "Start" CTA.
 *
 * Forward-compatible per AI_IMPLEMENTATION_GUIDE §13: it renders a static
 * text drill today and a video drill later with NO component change — pass a
 * `thumbnailUri` for the still and an `onStart` to make it launchable. The
 * "Start" CTA (the screen's single gold accent) only renders when there's an
 * `onStart`, so we never show a dead button.
 *
 * The gold Start reuses the Button primitive (AI_IMPLEMENTATION_GUIDE §7 —
 * never hand-roll a button); its radius is the app-standard rounded-rect
 * rather than the mock's full pill.
 *
 * Part of: src/features/analysis/
 */

import { Image, StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components/ui';
import { PlayIcon } from '@/features/analysis/components/AnalysisIcons';
import { colors, layout, spacing, typography } from '@/theme';

interface DrillCardProps {
  /** Drill name, e.g. "Towel-under-the-arm drill". */
  title: string;
  /** Optional one-line detail (duration / reps / what it trains). */
  detail?: string;
  /** Optional still for a video drill; falls back to the play-glyph tile. */
  thumbnailUri?: string;
  /** Supplied when the drill can be launched — gates the "Start" CTA. */
  onStart?: () => void;
}

export function DrillCard({ title, detail, thumbnailUri, onStart }: DrillCardProps) {
  return (
    <Card variant="raised" padding={13}>
      <View style={styles.row}>
        <View style={styles.thumb}>
          {thumbnailUri ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={StyleSheet.absoluteFill}
              accessibilityRole="image"
              accessibilityLabel={`${title} preview`}
            />
          ) : null}
          <View style={styles.playOverlay} pointerEvents="none">
            <PlayIcon color={colors.text.primary} size={22} />
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {detail ? (
            <Text style={styles.detail} numberOfLines={2}>
              {detail}
            </Text>
          ) : null}
        </View>

        {onStart ? (
          <Button label="Start" variant="primary" size="sm" onPress={onStart} />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: layout.borderRadius.md + 2, // 12 — matches design
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.base,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.bodyStrong,
  },
  detail: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 17,
    color: colors.text.secondary,
    marginTop: spacing[1] - 2, // 2 — matches design
  },
});
