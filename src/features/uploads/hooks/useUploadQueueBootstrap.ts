/**
 * useUploadQueueBootstrap — Feature hook
 * Drains the persistent upload queue once at app launch, after auth has
 * settled. Each queued job runs through `uploadRecording({fromQueue:
 * true})` so failures don't re-enqueue and create duplicates.
 *
 * Drain happens exactly once per process lifetime — we don't watch
 * network state in Phase 1.4. NetInfo-based auto-retry on reconnect is
 * recorded in TODO.md as a follow-up.
 *
 * Mounted via <UploadQueueBootstrap /> in App.tsx.
 */

import { useEffect, useRef } from 'react';

import { useAppStore } from '@/store/useAppStore';
import { uploadRecording } from '@/utils/upload';
import { bumpAttempts, list, remove } from '@/utils/uploadQueue';

const MAX_ATTEMPTS = 5;

export function useUploadQueueBootstrap(): void {
  const userId = useAppStore(s => s.user?.id ?? null);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);
  const drainedRef = useRef(false);

  useEffect(() => {
    if (drainedRef.current) return;
    if (isAuthLoading) return; // wait until session restore finishes
    if (!userId) return; // signed-out — no point trying
    drainedRef.current = true;

    let cancelled = false;
    (async () => {
      const jobs = list();
      for (const job of jobs) {
        if (cancelled) return;
        // Cap retries so a permanently-broken job doesn't spam the
        // network every launch forever. After MAX_ATTEMPTS the user
        // can re-trigger via a future "Retry" affordance.
        if (job.attempts >= MAX_ATTEMPTS) continue;
        bumpAttempts(job.jobId);
        const result = await uploadRecording({
          localUri: job.localUri,
          angle: job.angle,
          clubType: job.clubType,
          swingHand: job.swingHand,
          userId: job.userId,
          fromQueue: true,
        });
        if (!result.error) {
          remove(job.jobId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, userId]);
}
