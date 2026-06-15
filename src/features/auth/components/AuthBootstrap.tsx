/**
 * AuthBootstrap — Feature component
 * Side-effect-only mount point for the auth bootstrap hook. Renders
 * nothing. Lives in App.tsx so the subscription's lifetime matches the
 * app's, and so App.tsx itself stays free of business logic.
 */

import { useAuthBootstrap } from '@/features/auth/hooks/useAuthBootstrap';

export function AuthBootstrap(): null {
  useAuthBootstrap();
  return null;
}
