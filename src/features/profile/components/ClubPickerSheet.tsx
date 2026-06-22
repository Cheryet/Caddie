/**
 * ClubPickerSheet — Feature component
 * BottomSheet for choosing the default club, opened by the Preferences
 * "Default club" row. Reuses the shared `ClubChips` scroller; picking a club
 * commits and dismisses. Part of: src/features/profile/
 */

import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui';
import { ClubChips } from '@/components/swing-meta';
import type { ClubType } from '@/constants/clubs';
import { spacing, typography } from '@/theme';

interface ClubPickerSheetProps {
  visible: boolean;
  value: ClubType;
  onChange: (club: ClubType) => void;
  onDismiss: () => void;
}

export function ClubPickerSheet({
  visible,
  value,
  onChange,
  onDismiss,
}: ClubPickerSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      accessibilityLabel="Choose default club">
      <Text style={styles.title}>Default club</Text>
      <View style={styles.chips}>
        <ClubChips
          value={value}
          onChange={club => {
            onChange(club);
            onDismiss();
          }}
          paddingHorizontal={0}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.title2,
    paddingHorizontal: spacing[1],
    marginBottom: spacing[3],
  },
  chips: {
    marginHorizontal: -spacing[4], // bleed to sheet edges so chips scroll full-width
    paddingHorizontal: spacing[4],
  },
});
