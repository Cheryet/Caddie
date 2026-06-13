/**
 * HomeScreen — Screen
 * Placeholder. Real implementation in Phase 5.2 (home screen with stats
 * row + quick actions). For Phase 0.3, exposes debug navigation buttons
 * so the modal routes (Camera/Playback/Analysis/Comparison) and pushed
 * routes (VideoDetail/Settings) can be exercised before the custom tab
 * bar arrives in Phase 1.1.
 */

import { Placeholder } from '@/navigation/Placeholder';
import type { AppTabsScreenProps } from '@/navigation/types';

const DEMO_VIDEO_ID = 'demo-video';
const DEMO_VIDEO_ID_B = 'demo-video-b';

export function HomeScreen({ navigation }: AppTabsScreenProps<'HomeTab'>) {
  return (
    <Placeholder
      title="Home"
      phase="5.2"
      navButtons={[
        {
          label: 'Open Camera (modal)',
          onPress: () => navigation.navigate('Camera'),
        },
        {
          label: 'Open Playback (modal)',
          onPress: () =>
            navigation.navigate('Playback', { videoId: DEMO_VIDEO_ID }),
        },
        {
          label: 'Open Analysis (modal)',
          onPress: () =>
            navigation.navigate('Analysis', { videoId: DEMO_VIDEO_ID }),
        },
        {
          label: 'Open Comparison (modal)',
          onPress: () =>
            navigation.navigate('Comparison', {
              videoIdA: DEMO_VIDEO_ID,
              videoIdB: DEMO_VIDEO_ID_B,
            }),
        },
      ]}
    />
  );
}
