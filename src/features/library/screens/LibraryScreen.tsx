/**
 * LibraryScreen — Screen
 * Placeholder. Real implementation in Phase 1.5 (video library grid).
 */

import { Placeholder } from '@/navigation/Placeholder';
import type { LibraryStackScreenProps } from '@/navigation/types';

const DEMO_VIDEO_ID = 'demo-video';

export function LibraryScreen({
  navigation,
}: LibraryStackScreenProps<'Library'>) {
  return (
    <Placeholder
      title="Library"
      phase="1.5"
      navButtons={[
        {
          label: 'Push Video Detail',
          onPress: () =>
            navigation.navigate('VideoDetail', { videoId: DEMO_VIDEO_ID }),
        },
      ]}
    />
  );
}
