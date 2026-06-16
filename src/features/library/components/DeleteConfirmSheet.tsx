/**
 * DeleteConfirmSheet — Feature component
 * BottomSheet showing the destructive confirmation step before a
 * swing is removed. Per Apple HIG, destructive actions get a
 * confirmation; the row delete + Storage cleanup are run by the
 * parent (`useVideoManagement`).
 *
 * Visual treatment for the primary action uses `colors.semantic.error`
 * rather than the gold reserved for positive CTAs — this is the one
 * place red is correct (matches the "destructive" pattern from
 * ActionSheetIOS's `destructiveButtonIndex`).
 */

import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import type { Video } from '@/features/library/hooks/useVideos';

interface DeleteConfirmSheetProps {
  video: Video | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function DeleteConfirmSheet({
  video,
  isDeleting,
  onConfirm,
  onDismiss,
}: DeleteConfirmSheetProps) {
  const visible = video !== null;
  const subjectLabel = video?.clubType ?? video?.title ?? 'this swing';

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      accessibilityLabel="Delete swing confirmation"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Delete swing?</Text>
        <Text style={styles.subtitle}>
          Removing <Text style={styles.subjectStrong}>{subjectLabel}</Text>{' '}
          is permanent. The video and any analysis go with it.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Delete"
          onPress={onConfirm}
          variant="destructive"
          size="lg"
          loading={isDeleting}
          disabled={isDeleting}
          fullWidth
        />
        <View style={styles.cancelWrap}>
          <Button
            label="Cancel"
            onPress={onDismiss}
            variant="secondary"
            size="lg"
            disabled={isDeleting}
            fullWidth
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing[1],
    paddingBottom: spacing[4],
  },
  title: {
    ...typography.title1,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  subjectStrong: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  actions: {
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  cancelWrap: {
    marginTop: spacing[2],
  },
});
