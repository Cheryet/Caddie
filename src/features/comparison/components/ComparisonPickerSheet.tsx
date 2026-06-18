/**
 * ComparisonPickerSheet — Feature component
 * The "pick a swing" library picker for a comparison slot. A BottomSheet over
 * the user's videos (reusing useVideos + the VideoCard grid); tapping a card
 * fills the open slot. The other slot's video is excluded so you don't
 * compare a swing against itself.
 *
 * The list mounts only while the sheet is open (lazy fetch).
 *
 * Part of: src/features/comparison/
 */

import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import { VideoCard } from '@/features/library/components/VideoCard';
import { useVideos, type Video } from '@/features/library/hooks/useVideos';
import { colors, layout, spacing, typography } from '@/theme';

const NUM_COLUMNS = 2;
const COLUMN_GAP = spacing[3];
const LIST_MAX_HEIGHT = 460;

interface ComparisonPickerSheetProps {
  visible: boolean;
  onChoose: (videoId: string) => void;
  onDismiss: () => void;
  /** The other slot's video — hidden from the list to avoid duplicates. */
  excludeVideoId?: string | null;
}

export function ComparisonPickerSheet({
  visible,
  onChoose,
  onDismiss,
  excludeVideoId,
}: ComparisonPickerSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      accessibilityLabel="Pick a swing to compare">
      {visible ? (
        <PickerList onChoose={onChoose} excludeVideoId={excludeVideoId ?? null} />
      ) : null}
    </BottomSheet>
  );
}

interface PickerListProps {
  onChoose: (videoId: string) => void;
  excludeVideoId: string | null;
}

function PickerList({ onChoose, excludeVideoId }: PickerListProps) {
  const { videos, isLoading, error } = useVideos();
  const items = (videos ?? []).filter(v => v.id !== excludeVideoId);

  const handleChoose = (video: Video) => onChoose(video.id);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick a swing</Text>

      {isLoading && !videos ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.text.secondary} />
        </View>
      ) : error ? (
        <Text style={styles.message}>Couldn’t load your swings.</Text>
      ) : items.length === 0 ? (
        <Text style={styles.message}>No other swings to compare yet.</Text>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}>
          {items.map((video, index) => (
            <View
              key={video.id}
              style={[
                styles.cell,
                index % NUM_COLUMNS === 0
                  ? { paddingRight: COLUMN_GAP / 2 }
                  : { paddingLeft: COLUMN_GAP / 2 },
                { paddingBottom: COLUMN_GAP },
              ]}>
              <VideoCard video={video} onPress={handleChoose} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing[1],
  },
  title: {
    ...typography.title2,
    marginBottom: spacing[4],
  },
  centered: {
    paddingVertical: spacing[10],
    alignItems: 'center',
  },
  message: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing[8],
  },
  list: {
    maxHeight: LIST_MAX_HEIGHT,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: spacing[2],
  },
  cell: {
    flex: 1 / NUM_COLUMNS,
    minWidth: `${100 / NUM_COLUMNS}%`,
    borderRadius: layout.borderRadius.lg,
  },
});
