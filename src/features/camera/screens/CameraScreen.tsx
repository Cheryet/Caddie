/**
 * CameraScreen — Screen
 * Placeholder. Real implementation in Phases 1.2–1.3 (camera permissions
 * + video recording). Presented as a full-screen modal from the Record FAB.
 */

import { Placeholder } from '@/navigation/Placeholder';
import type { RootStackScreenProps } from '@/navigation/types';

export function CameraScreen({ navigation }: RootStackScreenProps<'Camera'>) {
  return (
    <Placeholder
      title="Camera"
      phase="1.2–1.3"
      onClose={() => navigation.goBack()}
    />
  );
}
