/**
 * ProfileScreen — Screen
 * Placeholder. Real implementation in Phase 5.4 (profile + settings).
 */

import { Placeholder } from '@/navigation/Placeholder';
import type { ProfileStackScreenProps } from '@/navigation/types';

export function ProfileScreen({
  navigation,
}: ProfileStackScreenProps<'Profile'>) {
  return (
    <Placeholder
      title="Profile"
      phase="5.4"
      navButtons={[
        {
          label: 'Push Settings',
          onPress: () => navigation.navigate('Settings'),
        },
      ]}
    />
  );
}
