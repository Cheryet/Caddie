/**
 * ComparisonScreen — Screen
 * Placeholder. Real implementation in Phase 5.1 (side-by-side comparison).
 * Presented as a full-screen modal.
 */

import { Placeholder } from '@/navigation/Placeholder';
import type { RootStackScreenProps } from '@/navigation/types';

export function ComparisonScreen({
  navigation,
  route,
}: RootStackScreenProps<'Comparison'>) {
  return (
    <Placeholder
      title="Comparison"
      phase="5.1"
      meta={`${route.params.videoIdA} vs ${route.params.videoIdB}`}
      onClose={() => navigation.goBack()}
    />
  );
}
