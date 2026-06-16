/**
 * HandSegmented — Right vs Left swing-hand toggle
 * Camera-angle picker used by CameraScreen (capture-time) and
 * ImportConfirmSheet. Includes the hand icon so callers can drop it
 * in without thinking about iconography.
 */

import { StyleSheet, View } from 'react-native';

import type { SwingHand } from '@/constants/camera';
import { layout } from '@/theme';

import { HandIcon } from './HandIcon';
import { PillTab } from './PillTab';
import { CHROME_BG, CHROME_BORDER, PILL_INACTIVE_LABEL } from './tokens';

interface HandSegmentedProps {
  value: SwingHand;
  onChange: (next: SwingHand) => void;
  disabled?: boolean;
}

export function HandSegmented({
  value,
  onChange,
  disabled,
}: HandSegmentedProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      <HandIcon color={PILL_INACTIVE_LABEL} />
      <View style={styles.tabs}>
        <PillTab
          label="Right"
          active={value === 'right'}
          onPress={() => onChange('right')}
          disabled={disabled}
          height={30}
        />
        <PillTab
          label="Left"
          active={value === 'left'}
          onPress={() => onChange('left')}
          disabled={disabled}
          height={30}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingLeft: 13,
    paddingRight: 5,
    paddingVertical: 3,
    borderRadius: layout.borderRadius.full,
    backgroundColor: CHROME_BG,
    borderWidth: 1,
    borderColor: CHROME_BORDER,
  },
  tabs: {
    flexDirection: 'row',
    gap: 3,
  },
});
