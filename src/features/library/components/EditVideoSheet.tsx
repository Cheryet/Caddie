/**
 * EditVideoSheet — Feature component
 * BottomSheet form for renaming and re-tagging a video. Pre-fills from
 * the selected Video; `onSave` is called with the user-edited shape
 * by the parent (`useVideoManagement`) which runs the Supabase update.
 *
 * Fields:
 *   title       — single-line Input
 *   angle       — AngleSegmented (face-on / DTL)
 *   swing hand  — HandSegmented (right / left)
 *   club        — ClubChips (canonical CLUBS list)
 *   tags        — comma-separated Input (split + trim + filter empty)
 *
 * The form lives inside the sheet; tapping the backdrop or "Cancel"
 * dismisses without saving (handled by the parent's onDismiss).
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Input } from '@/components/ui';
import {
  AngleSegmented,
  ClubChips,
  HandSegmented,
} from '@/components/swing-meta';
import { CLUBS } from '@/constants/clubs';
import type { CameraAngle, SwingHand } from '@/constants/camera';
import type { ClubType } from '@/constants/clubs';
import { colors, layout, spacing, typography } from '@/theme';
import type { Video } from '@/features/library/hooks/useVideos';
import type { VideoUpdates } from '@/features/library/hooks/useVideoManagement';

interface EditVideoSheetProps {
  video: Video | null;
  isSaving: boolean;
  onSave: (updates: VideoUpdates) => void;
  onDismiss: () => void;
}

export function EditVideoSheet({
  video,
  isSaving,
  onSave,
  onDismiss,
}: EditVideoSheetProps) {
  const visible = video !== null;

  // Form state is keyed on the video id so reopening with a different
  // video resets fields. Initialised from the video when visible.
  const [title, setTitle] = useState('');
  const [angle, setAngle] = useState<CameraAngle>('face-on');
  const [swingHand, setSwingHand] = useState<SwingHand>('right');
  const [club, setClub] = useState<ClubType>('7 Iron');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (!video) return;
    setTitle(video.title);
    setAngle(video.cameraAngle ?? 'face-on');
    setSwingHand(video.swingHand);
    setClub(coerceClub(video.clubType));
    setTagsInput(video.tags.join(', '));
  }, [video]);

  const handleSave = () => {
    onSave({
      title: title.trim() || (video?.title ?? 'Swing'),
      cameraAngle: angle,
      swingHand,
      clubType: club,
      tags: parseTags(tagsInput),
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      accessibilityLabel="Edit swing details"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Edit swing</Text>
        <Text style={styles.subtitle}>
          Rename, retag, or fix the angle/hand/club for this swing.
        </Text>
      </View>

      <View style={styles.fieldBlock}>
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Range — 7 Iron"
          autoCapitalize="sentences"
          autoCorrect
        />
      </View>

      <View style={styles.controlsRow}>
        <AngleSegmented value={angle} onChange={setAngle} />
        <HandSegmented value={swingHand} onChange={setSwingHand} />
      </View>

      <View style={styles.chipsWrap}>
        <ClubChips value={club} onChange={setClub} paddingHorizontal={0} />
      </View>

      <View style={styles.fieldBlock}>
        <Input
          label="Tags"
          value={tagsInput}
          onChangeText={setTagsInput}
          placeholder="range, warmup, slow-motion"
          autoCapitalize="none"
          autoCorrect={false}
          helper="Comma-separated. Tags are searchable in the library."
        />
      </View>

      <View style={styles.cta}>
        <Button
          label="Save changes"
          onPress={handleSave}
          variant="primary"
          size="lg"
          shadow
          loading={isSaving}
          disabled={isSaving}
          fullWidth
        />
      </View>
    </BottomSheet>
  );
}

// ───── Helpers ───────────────────────────────────────────────────────────

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

function coerceClub(raw: string | null): ClubType {
  if (raw && (CLUBS as readonly string[]).includes(raw)) {
    return raw as ClubType;
  }
  return '7 Iron';
}

// ───── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing[1],
    paddingBottom: spacing[3],
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
  fieldBlock: {
    paddingBottom: spacing[3],
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    alignItems: 'center',
    paddingBottom: spacing[3],
  },
  chipsWrap: {
    paddingBottom: spacing[2],
    marginBottom: -spacing[4],
  },
  cta: {
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    marginTop: spacing[2],
    borderRadius: layout.borderRadius.md,
  },
});
