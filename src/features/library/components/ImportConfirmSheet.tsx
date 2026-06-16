/**
 * ImportConfirmSheet — Feature component
 * Bottom-sheet shown after the user picks a video from their photo
 * library. Collects the same three pieces of metadata the camera
 * captures (angle, swing hand, club) and hands them back via
 * `onConfirm` so `useImportVideo` can hand off to the upload pipeline.
 *
 * Visual style mirrors the CameraScreen capture chrome — same
 * segmented controls and club chips — so the user feels they're in
 * the same kind of moment ("about to log a swing"), just with a
 * preselected file instead of a live capture.
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button } from '@/components/ui';
import {
  AngleSegmented,
  ClubChips,
  HandSegmented,
} from '@/components/swing-meta';
import {
  DEFAULT_CAMERA_ANGLE,
  DEFAULT_SWING_HAND,
} from '@/constants/camera';
import type { CameraAngle, SwingHand } from '@/constants/camera';
import type { ClubType } from '@/constants/clubs';
import { colors, layout, spacing, typography } from '@/theme';

export interface ImportConfirmMetadata {
  angle: CameraAngle;
  swingHand: SwingHand;
  club: ClubType;
}

interface ImportConfirmSheetProps {
  visible: boolean;
  defaultClub: ClubType;
  isUploading: boolean;
  onConfirm: (meta: ImportConfirmMetadata) => void;
  onDismiss: () => void;
}

export function ImportConfirmSheet({
  visible,
  defaultClub,
  isUploading,
  onConfirm,
  onDismiss,
}: ImportConfirmSheetProps) {
  const [angle, setAngle] = useState<CameraAngle>(DEFAULT_CAMERA_ANGLE);
  const [swingHand, setSwingHand] = useState<SwingHand>(DEFAULT_SWING_HAND);
  const [club, setClub] = useState<ClubType>(defaultClub);

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      accessibilityLabel="Confirm imported swing details"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Confirm swing</Text>
        <Text style={styles.subtitle}>
          Tag the angle, hand, and club so analysis frames the swing right.
        </Text>
      </View>

      <View style={styles.controlsRow}>
        <AngleSegmented value={angle} onChange={setAngle} />
        <HandSegmented value={swingHand} onChange={setSwingHand} />
      </View>

      <View style={styles.chipsWrap}>
        <ClubChips value={club} onChange={setClub} paddingHorizontal={0} />
      </View>

      <View style={styles.cta}>
        <Button
          label="Use this swing"
          onPress={() => onConfirm({ angle, swingHand, club })}
          variant="primary"
          size="lg"
          shadow
          loading={isUploading}
          disabled={isUploading}
          fullWidth
        />
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
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    alignItems: 'center',
    paddingBottom: spacing[4],
  },
  chipsWrap: {
    paddingBottom: spacing[2],
    // ClubChips has its own paddingBottom; we negate to keep tight spacing.
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
