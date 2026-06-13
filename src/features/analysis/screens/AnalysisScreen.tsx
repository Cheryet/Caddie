/**
 * AnalysisScreen — Screen
 * Placeholder. Real implementation in Phases 4.3–4.4 (analysis UI +
 * end-to-end Claude Vision flow). Presented as a full-screen modal.
 */

import { Placeholder } from '@/navigation/Placeholder';
import type { RootStackScreenProps } from '@/navigation/types';

export function AnalysisScreen({
  navigation,
  route,
}: RootStackScreenProps<'Analysis'>) {
  return (
    <Placeholder
      title="Analysis"
      phase="4.3–4.4"
      meta={`videoId: ${route.params.videoId}`}
      onClose={() => navigation.goBack()}
    />
  );
}
