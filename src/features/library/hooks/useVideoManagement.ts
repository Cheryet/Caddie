/**
 * useVideoManagement — Feature hook
 * Orchestrates Phase 1.8: long-press on a VideoCard opens an iOS
 * action sheet (Edit / Delete / Cancel); selecting an option opens
 * the appropriate BottomSheet; saving/deleting runs the Supabase
 * operation, refreshes the library, and toasts the result.
 *
 *   start(video)          → ActionSheetIOS
 *     "Edit details"      → editSheet opens with the video pre-filled
 *     "Delete swing"      → deleteSheet opens with destructive confirm
 *     "Cancel"            → no-op
 *
 *   editSheet.onSave      → supabase update → refresh + toast
 *   deleteSheet.onConfirm → supabase row delete → optimistic refresh
 *                            + background Storage cleanup + toast
 *
 * Storage cleanup runs AFTER the row delete and never blocks the UI —
 * if a thumbnail or video file fails to delete the user-visible state
 * is already correct; the orphan is recoverable by a future cleanup
 * job (recorded in TODO.md).
 *
 * Used by: LibraryScreen.
 */

import { useCallback, useState } from 'react';
import { ActionSheetIOS } from 'react-native';

import { Toast } from '@/components/ui';
import { supabase } from '@/core/supabase/client';
import { deleteThumbnail, deleteVideo } from '@/core/supabase/storage';
import type { CameraAngle, SwingHand } from '@/constants/camera';
import type { ClubType } from '@/constants/clubs';
import type { Video } from '@/features/library/hooks/useVideos';

// ───── Public shapes ─────────────────────────────────────────────────────

export interface VideoUpdates {
  title: string;
  clubType: ClubType;
  cameraAngle: CameraAngle;
  swingHand: SwingHand;
  tags: string[];
}

interface UseVideoManagementArgs {
  /** Called after a successful save or delete so the grid can re-fetch. */
  onMutationComplete?: () => Promise<void> | void;
}

interface UseVideoManagementReturn {
  start: (video: Video) => void;
  editSheet: {
    video: Video | null;
    isSaving: boolean;
    onSave: (updates: VideoUpdates) => Promise<void>;
    onDismiss: () => void;
  };
  deleteSheet: {
    video: Video | null;
    isDeleting: boolean;
    onConfirm: () => Promise<void>;
    onDismiss: () => void;
  };
}

// ───── Hook ──────────────────────────────────────────────────────────────

export function useVideoManagement({
  onMutationComplete,
}: UseVideoManagementArgs = {}): UseVideoManagementReturn {
  const [editing, setEditing] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState<Video | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const start = useCallback((video: Video) => {
    if (editing || deleting) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Edit details', 'Delete swing', 'Cancel'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
        userInterfaceStyle: 'dark',
      },
      index => {
        if (index === 0) setEditing(video);
        else if (index === 1) setDeleting(video);
      },
    );
  }, [editing, deleting]);

  // ── Edit ──────────────────────────────────────────────────────────────
  const onSave = useCallback(
    async (updates: VideoUpdates) => {
      if (!editing || isSaving) return;
      setIsSaving(true);

      const { error } = await supabase
        .from('videos')
        .update({
          title: updates.title,
          club_type: updates.clubType,
          camera_angle: updates.cameraAngle,
          swing_hand: updates.swingHand,
          tags: updates.tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);

      setIsSaving(false);
      if (error) {
        Toast.show({
          message: error.message || 'Could not save changes.',
          variant: 'error',
        });
        return;
      }

      Toast.show({ message: 'Swing updated.', variant: 'success' });
      setEditing(null);
      if (onMutationComplete) await onMutationComplete();
    },
    [editing, isSaving, onMutationComplete],
  );

  const onEditDismiss = useCallback(() => {
    if (isSaving) return;
    setEditing(null);
  }, [isSaving]);

  // ── Delete ────────────────────────────────────────────────────────────
  const onConfirmDelete = useCallback(async () => {
    if (!deleting || isDeleting) return;
    setIsDeleting(true);

    // Row delete first — authoritative for the user's view.
    const { error: rowError } = await supabase
      .from('videos')
      .delete()
      .eq('id', deleting.id);

    if (rowError) {
      setIsDeleting(false);
      Toast.show({
        message: rowError.message || 'Could not delete swing.',
        variant: 'error',
      });
      return;
    }

    // Storage cleanup in the background. Failures here leave orphan
    // files but the user's grid is already correct — a future cleanup
    // job reconciles. See TODO.md.
    const storagePath = deleting.storagePath;
    const thumbnailPath = deleting.thumbnailPath;
    Promise.all([
      deleteVideo(storagePath),
      thumbnailPath ? deleteThumbnail(thumbnailPath) : Promise.resolve(null),
    ]).catch(err => {
      if (__DEV__) {
        console.warn('[useVideoManagement] storage cleanup failed', err);
      }
    });

    setIsDeleting(false);
    setDeleting(null);
    Toast.show({ message: 'Swing deleted.', variant: 'success' });
    if (onMutationComplete) await onMutationComplete();
  }, [deleting, isDeleting, onMutationComplete]);

  const onDeleteDismiss = useCallback(() => {
    if (isDeleting) return;
    setDeleting(null);
  }, [isDeleting]);

  return {
    start,
    editSheet: {
      video: editing,
      isSaving,
      onSave,
      onDismiss: onEditDismiss,
    },
    deleteSheet: {
      video: deleting,
      isDeleting,
      onConfirm: onConfirmDelete,
      onDismiss: onDeleteDismiss,
    },
  };
}
