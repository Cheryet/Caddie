/**
 * UploadQueueBootstrap — Feature component
 * Side-effect-only mount point for the queue-drain hook. Renders nothing.
 * Lives in App.tsx alongside <AuthBootstrap /> and <RevenueCatBootstrap />.
 */

import { useUploadQueueBootstrap } from '@/features/uploads/hooks/useUploadQueueBootstrap';

export function UploadQueueBootstrap(): null {
  useUploadQueueBootstrap();
  return null;
}
