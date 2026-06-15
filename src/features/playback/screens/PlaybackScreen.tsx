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
  // Until PlaybackScreen lands for real (Phase 1.7), just surface
  // whichever discriminant the route was opened with so it's visible
  // during dev that recording → preview routes the local URI correctly.
  const params = route.params;
  const meta =
    'localUri' in params
      ? `localUri: ${params.localUri} · ${params.clubType} · ${params.angle} · ${params.swingHand}`
      : `videoId: ${params.videoId}`;

  return (
    <Placeholder
      title="Playback"
      phase="1.7"
      meta={meta}
      onClose={() => navigation.goBack()}
    />
  );
}
