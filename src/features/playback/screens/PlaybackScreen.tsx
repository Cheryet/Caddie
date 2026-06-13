/**
 * PlaybackScreen — Screen
 * Placeholder. Real implementation in Phase 1.7 (video playback with
 * scrub + speed controls). Presented as a full-screen modal.
 */

import { Placeholder } from '@/navigation/Placeholder';
import type { RootStackScreenProps } from '@/navigation/types';

export function PlaybackScreen({
  navigation,
  route,
}: RootStackScreenProps<'Playback'>) {
  return (
    <Placeholder
      title="Playback"
      phase="1.7"
      meta={`videoId: ${route.params.videoId}`}
      onClose={() => navigation.goBack()}
    />
  );
}
