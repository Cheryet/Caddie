/**
 * AngleSegmented — Face-on vs DTL toggle
 * Camera-angle picker used by CameraScreen (capture-time) and
 * ImportConfirmSheet (after picking a video from the photo library).
 * Visual layout mirrors Caddie Screens.dc.html §02 capture chrome.
 */

import { StyleSheet, View } from 'react-native';

import type { CameraAngle } from '@/constants/camera';
import { layout } from '@/theme';

import { PillTab } from './PillTab';
import { CHROME_BG, CHROME_BORDER } from './tokens';

interface AngleSegmentedProps {
  value: CameraAngle;
  onChange: (next: CameraAngle) => void;
  disabled?: boolean;
}

export function AngleSegmented({
  value,
  onChange,
  disabled,
}: AngleSegmentedProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      <PillTab
        label="Face-on"
        active={value === 'face-on'}
        onPress={() => onChange('face-on')}
        disabled={disabled}
      />
      <PillTab
        label="DTL"
        active={value === 'dtl'}
        onPress={() => onChange('dtl')}
        disabled={disabled}
      />
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
  },
});
