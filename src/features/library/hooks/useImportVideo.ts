/**
 * useImportVideo — Feature hook
 * Drives the photo-library import flow (PROJECT_SPEC.md §22 Phase 1.6) up
 * to the review hand-off:
 *
 *   start()  → pickVideo() → on cancel, no-op; on too_long/error, toast
 *            → on success, open the confirm sheet with the picked URI
 *   confirm(meta) → hand the picked URI + metadata to `onReview` and close
 *                   the sheet. The PlaybackScreen then lets the user trim
 *                   and Save — the upload happens there, unified with the
 *                   recording flow, so imports are trimmable too.
 *
 * Stays presentation-agnostic: LibraryScreen renders the sheet and owns
 * navigation; this hook just drives the pick → confirm lifecycle.
 *
 * Used by: LibraryScreen.
 */

import { useCallback, useState } from 'react';

import { Toast } from '@/components/ui';
import type { ClubType } from '@/constants/clubs';
import { loadLastClub, setLastClub } from '@/utils/lastClub';
import { pickVideo } from '@/utils/picker';

import type { ImportConfirmMetadata } from '@/features/library/components/ImportConfirmSheet';

interface UseImportVideoArgs {
  /**
   * Called with the picked clip + metadata so the caller can route to the
   * PlaybackScreen for review / trim / Save (the upload happens there).
   */
  onReview: (uri: string, meta: ImportConfirmMetadata) => void;
}

interface UseImportVideoReturn {
  /** Begin a new import. Idempotent — calling while busy is a no-op. */
  start: () => Promise<void>;
  /**
   * True from `start()` until the sheet opens or an error fires. The
   * LibraryScreen renders the "Preparing video…" overlay from this; it's
   * held back by OVERLAY_PRESENT_DELAY_MS so it can't flash before
   * PHPicker covers the root view.
   */
  isProcessing: boolean;
  sheet: {
    visible: boolean;
    defaultClub: ClubType;
    onConfirm: (meta: ImportConfirmMetadata) => void;
    onDismiss: () => void;
  };
}

interface PendingImport {
  uri: string;
}

// Hold the "Preparing video…" overlay off-screen this long so it can't
// briefly flash before PHPicker's present-animation covers the root view.
// PHPicker lands in ~300–500ms but iOS occasionally takes longer on first
// launch; 2s is a comfortable margin (the overlay still hides as soon as
// `pending` is set).
const OVERLAY_PRESENT_DELAY_MS = 2000;

export function useImportVideo({
  onReview,
}: UseImportVideoArgs): UseImportVideoReturn {
  const [pending, setPending] = useState<PendingImport | null>(null);
  // `isPicking` guards against double-starts; `isProcessing` is the public
  // flag the LibraryScreen reads, held back by OVERLAY_PRESENT_DELAY_MS.
  const [isPicking, setIsPicking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Read lazily so the default reflects the latest MMKV value each time the
  // sheet opens.
  const [defaultClub, setDefaultClub] = useState<ClubType>(loadLastClub);

  const start = useCallback(async () => {
    if (pending || isPicking) return;

    setIsPicking(true);
    const overlayTimer = setTimeout(
      () => setIsProcessing(true),
      OVERLAY_PRESENT_DELAY_MS,
    );

    try {
      const result = await pickVideo();

      if (result.error) {
        if (result.error.code === 'cancelled') return; // silent
        Toast.show({ message: result.error.message, variant: 'error' });
        return;
      }
      if (!result.data) return;

      setDefaultClub(loadLastClub());
      setPending({ uri: result.data.uri });
    } finally {
      clearTimeout(overlayTimer);
      setIsProcessing(false);
      setIsPicking(false);
    }
  }, [pending, isPicking]);

  const onDismiss = useCallback(() => {
    setPending(null);
  }, []);

  const onConfirm = useCallback(
    (meta: ImportConfirmMetadata) => {
      if (!pending) return;
      // Persist the picked club so the next launch defaults match.
      setLastClub(meta.club);
      const uri = pending.uri;
      setPending(null);
      onReview(uri, meta);
    },
    [pending, onReview],
  );

  return {
    start,
    isProcessing,
    sheet: {
      visible: pending !== null,
      defaultClub,
      onConfirm,
      onDismiss,
    },
  };
}
