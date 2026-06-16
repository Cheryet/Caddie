/**
 * useImportVideo — Feature hook
 * Orchestrates the photo-library import flow per PROJECT_SPEC.md §22
 * Phase 1.6:
 *
 *   start()  → pickVideo() → on cancel, no-op; on too_long/error, toast
 *            → on success, open the confirm sheet with the picked URI
 *   confirm(meta)  → uploadRecording() with the picked URI + metadata
 *                  → success toast + refresh callback
 *                  → failure toast (the upload pipeline already enqueues
 *                    to MMKV so the row will land on next launch)
 *
 * Stays presentation-agnostic: the consumer (LibraryScreen) is the one
 * that renders the sheet — this hook just owns the lifecycle. That
 * separation keeps the hook reusable if a future Home screen wants the
 * same import button without inheriting Library's sheet styling.
 *
 * Used by: LibraryScreen.
 */

import { useCallback, useState } from 'react';

import { Toast } from '@/components/ui';
import type { CameraAngle, SwingHand } from '@/constants/camera';
import type { ClubType } from '@/constants/clubs';
import { useAppStore } from '@/store/useAppStore';
import { uploadRecording } from '@/utils/upload';
import { loadLastClub, setLastClub } from '@/utils/lastClub';
import { pickVideo } from '@/utils/picker';

import type { ImportConfirmMetadata } from '@/features/library/components/ImportConfirmSheet';

interface UseImportVideoArgs {
  /** Called after a successful upload so the grid can re-fetch. */
  onUploadComplete?: () => Promise<void> | void;
}

interface UseImportVideoReturn {
  /** Begin a new import. Idempotent — calling while busy is a no-op. */
  start: () => Promise<void>;
  /**
   * True from the moment `start()` is invoked until the sheet opens or
   * an error fires. The LibraryScreen renders the "Preparing video…"
   * overlay as a plain absolute View (NOT a Modal) so it stays inside
   * the LibraryScreen view tree — PHPicker presents above it visually,
   * and the overlay only becomes apparent the moment PHPicker dismisses.
   * This fills the iOS asset-copy gap between picker dismiss and our
   * Promise resolving, with no race against PHPicker's presentation.
   */
  isProcessing: boolean;
  sheet: {
    visible: boolean;
    defaultClub: ClubType;
    isUploading: boolean;
    onConfirm: (meta: ImportConfirmMetadata) => Promise<void>;
    onDismiss: () => void;
  };
}

interface PendingImport {
  uri: string;
}

// Hold the "Preparing video…" overlay off the screen for this long so
// it can't briefly flash before PHPicker's present-animation covers the
// root view. PHPicker's animation lands in ~300–500ms, but iOS
// occasionally takes longer on first-launch; 2s is a comfortable margin
// without making fast picks feel laggy (the overlay still hides as
// soon as `pending` is set).
const OVERLAY_PRESENT_DELAY_MS = 2000;

export function useImportVideo({
  onUploadComplete,
}: UseImportVideoArgs = {}): UseImportVideoReturn {
  const userId = useAppStore(s => s.user?.id ?? null);

  const [pending, setPending] = useState<PendingImport | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // `isPicking` is the internal guard against double-starts.
  // `isProcessing` is the public flag the LibraryScreen reads to render
  // the overlay — held back by OVERLAY_PRESENT_DELAY_MS so the overlay
  // can't flash before PHPicker covers the root view.
  const [isPicking, setIsPicking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Read lazily so the default reflects the latest MMKV value each time
  // the sheet opens — otherwise selecting a club in the camera flow
  // wouldn't propagate to a later import without a remount.
  const [defaultClub, setDefaultClub] = useState<ClubType>(loadLastClub);

  const start = useCallback(async () => {
    if (pending || isUploading || isPicking) return;

    setIsPicking(true);
    // The overlay only renders after PHPicker has had time to fully
    // present above the root view. If the user picks or cancels before
    // the timer fires, the cleanup in `finally` aborts it.
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
  }, [pending, isUploading, isPicking]);

  const onDismiss = useCallback(() => {
    if (isUploading) return; // don't drop the sheet mid-upload
    setPending(null);
  }, [isUploading]);

  const onConfirm = useCallback(
    async (meta: ImportConfirmMetadata) => {
      if (!pending || !userId) return;
      setIsUploading(true);
      // Persist the picked club so the next launch defaults match.
      setLastClub(meta.club);

      const result = await uploadRecording({
        localUri: pending.uri,
        angle: meta.angle as CameraAngle,
        swingHand: meta.swingHand as SwingHand,
        clubType: meta.club,
        userId,
      });

      setIsUploading(false);
      setPending(null);

      if (result.error) {
        Toast.show({
          message: 'Could not import. We’ll retry on next launch.',
          variant: 'error',
        });
        return;
      }
      Toast.show({ message: 'Swing imported.', variant: 'success' });
      if (onUploadComplete) await onUploadComplete();
    },
    [pending, userId, onUploadComplete],
  );

  return {
    start,
    isProcessing,
    sheet: {
      visible: pending !== null,
      defaultClub,
      isUploading,
      onConfirm,
      onDismiss,
    },
  };
}
