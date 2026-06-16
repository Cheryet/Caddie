/**
 * ClubChips — horizontal scroller of club chips
 * Renders every entry in `CLUBS` as a pill; tapping selects. Used by
 * CameraScreen (capture-time) and ImportConfirmSheet (after photo pick).
 *
 * Persistence of the *last selected club* lives in the consuming screen
 * (CameraScreen handles `mmkv.set('camera.lastClub', club)`) — this
 * component is purely presentational so the import flow can read the
 * same MMKV key for its default without coupling to capture lifecycle.
 */

import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { CLUBS, type ClubType } from '@/constants/clubs';
import { colors, layout, spacing } from '@/theme';

import { CHROME_BORDER, PILL_INACTIVE_LABEL } from './tokens';

interface ClubChipsProps {
  value: ClubType;
  onChange: (next: ClubType) => void;
  /** Override the default horizontal padding (spacing[4]). */
  paddingHorizontal?: number;
}

export function ClubChips({
  value,
  onChange,
  paddingHorizontal,
}: ClubChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.scroll,
        paddingHorizontal !== undefined && { paddingHorizontal },
      ]}
    >
      {CLUBS.map(c => {
        const selected = c === value;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text
              style={[styles.label, selected && styles.labelSelected]}
            >
              {c}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[5] + 2,
    gap: 8,
  },
  chip: {
    paddingHorizontal: spacing[4],
    height: 34,
    borderRadius: layout.borderRadius.full,
    borderWidth: 1,
    borderColor: CHROME_BORDER,
    backgroundColor: 'rgba(12,12,12,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: PILL_INACTIVE_LABEL,
  },
  labelSelected: {
    color: colors.text.inverse,
  },
});
