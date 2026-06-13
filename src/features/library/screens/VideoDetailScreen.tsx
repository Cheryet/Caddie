/**
 * VideoDetailScreen — Screen
 * Placeholder. Real implementation in Phase 1.8 (video management).
 */

import { Placeholder } from '@/navigation/Placeholder';
import type { LibraryStackScreenProps } from '@/navigation/types';

export function VideoDetailScreen({
  route,
}: LibraryStackScreenProps<'VideoDetail'>) {
  return (
    <Placeholder
      title="Video detail"
      phase="1.8"
      meta={`videoId: ${route.params.videoId}`}
    />
  );
}
