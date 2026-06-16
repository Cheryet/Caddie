/**
 * usePoseStatus — Feature hook
 * Subscribes to the pose-client singleton and returns the current
 * status + last init error. Components use this to gate UI on
 * `status === 'ready'` (Phase 3.2 will use it for the overlay
 * toggle).
 *
 * Mirrors the Toast/ToastHost pattern — listener registered on
 * mount, removed on unmount.
 */

import { useEffect, useState } from 'react';

import {
  getPoseError,
  getPoseStatus,
  subscribePoseStatus,
  type PoseInitError,
  type PoseStatus,
} from '@/core/pose';

export interface UsePoseStatusReturn {
  status: PoseStatus;
  error: PoseInitError | null;
}

export function usePoseStatus(): UsePoseStatusReturn {
  const [status, setStatus] = useState<PoseStatus>(getPoseStatus);
  const [error, setError] = useState<PoseInitError | null>(getPoseError);

  useEffect(() => {
    return subscribePoseStatus((next, err) => {
      setStatus(next);
      setError(err);
    });
  }, []);

  return { status, error };
}
