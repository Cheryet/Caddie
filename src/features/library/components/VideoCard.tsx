/**
 * VideoCard — Feature component
 * One cell in the LibraryScreen grid. Mirrors Caddie Screens.dc.html §04
 * "LibraryScreen · default":
 *   - portrait 3:4 thumbnail with a subtle border
 *   - green AI dot pill top-left when the video has analysis
 *   - mono duration badge bottom-right
 *   - small play affordance centred on top of the thumb
 *   - club name + relative date below the thumb
 *
 * Tap fires `onPress`; the screen routes to Playback (or wherever it
 * makes sense) — this card is presentational only.
 */

import { useMemo } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, layout, spacing, typography } from '@/theme';
import type { Video } from '@/features/library/hooks/useVideos';
import { formatRelativeDate } from '@/utils/relativeTime';

interface VideoCardProps {
  video: Video;
  onPress: (video: Video) => void;
  /** Long-press opens the management action sheet (Phase 1.8). */
  onLongPress?: (video: Video) => void;
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoCard({ video, onPress, onLongPress }: VideoCardProps) {
  const relativeDate = useMemo(
    () => formatRelativeDate(video.createdAt),
    [video.createdAt],
  );
  const duration = useMemo(
    () => formatDuration(video.durationMs),
    [video.durationMs],
  );
  // Title is the user-editable card label (defaults to the club name
  // on upload, see `src/utils/upload.ts`). When the user customises
  // it from Edit details, this is the field the change appears in.
  // Fallback chain handles legacy rows where title might be empty.
  const cardLabel = video.title?.trim() || video.clubType || 'Swing';

  return (
    <Pressable
      onPress={() => onPress(video)}
      onLongPress={onLongPress ? () => onLongPress(video) : undefined}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`${cardLabel}, ${relativeDate || 'recent'}`}
      accessibilityHint={onLongPress ? 'Double tap to play, long-press for options' : undefined}
      style={styles.root}
    >
      <View style={styles.thumb}>
        {video.thumbnailUrl ? (
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}

        {video.hasAnalysis ? (
          <View
            style={styles.aiBadge}
            accessibilityLabel="Analysed swing"
          >
            <View style={styles.aiDot} />
            <Text style={styles.aiText}>AI</Text>
          </View>
        ) : null}

        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{duration}</Text>
        </View>

        <View style={styles.playWrap} pointerEvents="none">
          <View style={styles.playCircle}>
            <Svg width={15} height={15} viewBox="0 0 24 24">
              <Path d="M8 5l12 7-12 7z" fill={colors.text.primary} />
            </Svg>
          </View>
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.club} numberOfLines={1}>
          {cardLabel}
        </Text>
        {relativeDate ? (
          <Text style={styles.date} numberOfLines={1}>
            {relativeDate}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const THUMB_RADIUS = layout.borderRadius.lg; // 14
const AI_GREEN = colors.semantic.success;

const styles = StyleSheet.create({
  root: {
    flexDirection: 'column',
  },
  thumb: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: THUMB_RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.elevated,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    backgroundColor: colors.bg.elevated,
  },
  aiBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: layout.borderRadius.full,
    backgroundColor: 'rgba(10,10,10,0.66)',
    borderWidth: 1,
    borderColor: 'rgba(109,201,138,0.3)',
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AI_GREEN,
  },
  aiText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: AI_GREEN,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 9,
    right: 9,
    height: 20,
    paddingHorizontal: 7,
    borderRadius: layout.borderRadius.sm,
    backgroundColor: 'rgba(10,10,10,0.7)',
    justifyContent: 'center',
  },
  durationText: {
    ...typography.dataSmall,
    fontSize: 11,
    letterSpacing: 0,
    color: colors.text.primary,
  },
  playWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  playCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(10,10,10,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    paddingTop: 9,
    paddingHorizontal: 2,
  },
  club: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: -0.1,
  },
  date: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing[0.5],
  },
});
