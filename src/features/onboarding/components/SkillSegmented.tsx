/**
 * SkillSegmented — Feature component
 * Beginner / Intermediate / Advanced picker for onboarding, mapping to
 * `profiles.skill_level`. Built from the shared `PillTab` atom in the same
 * chrome-pill style as AngleSegmented. Part of: src/features/onboarding/
 */

import { StyleSheet, View } from 'react-native';

import { PillTab } from '@/components/swing-meta/PillTab';
import { CHROME_BG, CHROME_BORDER } from '@/components/swing-meta/tokens';
import { layout } from '@/theme';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

const OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

interface SkillSegmentedProps {
  value: SkillLevel;
  onChange: (next: SkillLevel) => void;
  disabled?: boolean;
}

export function SkillSegmented({ value, onChange, disabled }: SkillSegmentedProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {OPTIONS.map(o => (
        <PillTab
          key={o.value}
          label={o.label}
          active={value === o.value}
          onPress={() => onChange(o.value)}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: layout.borderRadius.full,
    backgroundColor: CHROME_BG,
    borderWidth: 1,
    borderColor: CHROME_BORDER,
    alignSelf: 'flex-start',
  },
});
