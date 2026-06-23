/**
 * upload — Utility
 * Orchestrates the swing-recording → published-video pipeline. Pulls
 * together: react-native-compressor (compress + thumbnail), the
 * Supabase storage wrapper (upload), and the videos table (insert).
 *
 * Pipeline (PROJECT_SPEC.md §13 lines 580-587):
 *   1. Compress the recording
 *   2. Extract a thumbnail
 *   3. Upload the thumbnail (blocking — UI needs it immediately)
 *   4. Upload the compressed video
 *   5. Insert the videos row only when both uploads succeeded
 *   6. Failure at any step → persist remaining work to the MMKV queue
 *
 * The row insert deliberately happens LAST. Until both uploads land,
 * the library shouldn't show a half-uploaded swing — see
 * TODO.md / commit history for the upload-status alternative we
 * deferred.
 *
 * Used by: PlaybackScreen (on mount with a localUri), UploadQueueBootstrap
 * (drain on launch). Never imported by feature code directly.
 */

import { Video, createVideoThumbnail, uuidv4 } from 'react-native-compressor';

import { supabase } from '@/core/supabase/client';
import {
  uploadThumbnail,
  uploadVideo,
} from '@/core/supabase/storage';
import type { StorageError } from '@/core/supabase/storage';

import { enqueue } from './uploadQueue';
import type { NewUploadJob } from './uploadQueue';

// ───── Input / output ────────────────────────────────────────────────────

export interface UploadRecordingInput {
  localUri: string;
  angle: 'face-on' | 'dtl';
  swingHand: 'right' | 'left';
  clubType: string;
  userId: string;
  /**
   * Known clip duration in ms, stored on the row at insert time. The
   * PlaybackScreen Save flow knows this (trimmed length, or the player's
   * loaded duration) so the library card shows the right badge straight
   * away instead of 0:00. Omitted by the queue drain (no player there) —
   * those rows are backfilled on first play.
   */
  durationMs?: number;
  /**
   * If true (queue retries), DON'T re-enqueue on failure — the caller is
   * already handling the retry loop and would create a duplicate job.
   */
  fromQueue?: boolean;
}

export interface UploadRecordingResult {
  videoId: string;
}

export type UploadErrorCode =
  | 'compress_failed'
  | 'thumbnail_failed'
  | 'thumbnail_upload_failed'
  | 'video_upload_failed'
  | 'row_insert_failed'
  | 'unknown';

export interface UploadError {
  code: UploadErrorCode;
  message: string;
  /** Underlying storage error if the failure came from Supabase. */
  cause?: StorageError;
}

export interface UploadResult {
  data: UploadRecordingResult | null;
  error: UploadError | null;
}

function ok(data: UploadRecordingResult): UploadResult {
  return { data, error: null };
}

function fail(error: UploadError): UploadResult {
  return { data: null, error };
}

// ───── Pipeline ──────────────────────────────────────────────────────────

/**
 * Run the full upload pipeline for one recording.
 *
 * Resolves to `{ data, error }`. Callers branch on `error` — never throws.
 * On failure (any step), the job is added to the MMKV queue unless
 * `fromQueue` is set.
 */
export async function uploadRecording(
  input: UploadRecordingInput,
): Promise<UploadResult> {
  const videoId = uuidv4();

  // ─── 1. Compress ───────────────────────────────────────────────────
  let compressedPath: string;
  try {
    compressedPath = await Video.compress(input.localUri, {
      compressionMethod: 'auto',
    });
  } catch (err) {
    return finalize(input, {
      code: 'compress_failed',
      message: errMessage(err) || 'Failed to compress video.',
    });
  }

  // ─── 2. Extract thumbnail ──────────────────────────────────────────
  // createVideoThumbnail grabs the first frame. For a golf swing
  // recording the first frame is the address position — a fine
  // representative thumbnail. Time-offset extraction can come later
  // if user testing shows a problem.
  let thumbnailLocalPath: string;
  try {
    const thumb = await createVideoThumbnail(compressedPath);
    thumbnailLocalPath = thumb.path;
  } catch (err) {
    return finalize(input, {
      code: 'thumbnail_failed',
      message: errMessage(err) || 'Failed to extract thumbnail.',
    });
  }

  // ─── 3. Upload thumbnail (blocking) ────────────────────────────────
  const thumbUpload = await uploadThumbnail(
    input.userId,
    videoId,
    thumbnailLocalPath,
  );
  if (thumbUpload.error) {
    return finalize(input, {
      code: 'thumbnail_upload_failed',
      message: thumbUpload.error.message,
      cause: thumbUpload.error,
    });
  }

  // ─── 4. Upload video ───────────────────────────────────────────────
  const videoUpload = await uploadVideo(input.userId, videoId, compressedPath);
  if (videoUpload.error) {
    return finalize(input, {
      code: 'video_upload_failed',
      message: videoUpload.error.message,
      cause: videoUpload.error,
    });
  }

  // ─── 5. Insert videos row ──────────────────────────────────────────
  // The row goes in LAST so the library only shows fully-uploaded
  // swings (see TODO.md for the upload_status alternative we deferred).
  const { error: insertError } = await supabase.from('videos').insert({
    id: videoId,
    user_id: input.userId,
    // Default to the club name only — the LibraryScreen card shows
    // a relative date on its second line, so embedding the date here
    // would double up. Users can rename via the Edit details sheet.
    title: input.clubType,
    storage_path: videoUpload.data!.storagePath,
    thumbnail_path: thumbUpload.data!.storagePath,
    camera_angle: input.angle,
    swing_hand: input.swingHand,
    club_type: input.clubType,
    ...(input.durationMs && input.durationMs > 0
      ? { duration_ms: Math.round(input.durationMs) }
      : {}),
  });
  if (insertError) {
    return finalize(input, {
      code: 'row_insert_failed',
      message: insertError.message || 'Failed to record swing.',
    });
  }

  return ok({ videoId });
}

/**
 * Persist a swing's playback duration once it's known. Recordings are
 * inserted (above) BEFORE the player has loaded the clip, so `duration_ms`
 * starts null and the library card shows 0:00. PlaybackScreen calls this once
 * the player reports the duration — fixing fresh recordings and backfilling
 * older rows the first time they're played. Best-effort: a failure just
 * leaves the badge at 0:00, so the error is swallowed.
 */
export async function setVideoDuration(
  videoId: string,
  durationMs: number,
): Promise<void> {
  if (durationMs <= 0) return;
  await supabase
    .from('videos')
    .update({ duration_ms: Math.round(durationMs) })
    .eq('id', videoId);
}

// ───── Helpers ───────────────────────────────────────────────────────────

function finalize(
  input: UploadRecordingInput,
  error: UploadError,
): UploadResult {
  // Only the live caller enqueues. The queue draining flow passes
  // `fromQueue: true` so we don't double-enqueue on every retry.
  if (!input.fromQueue) {
    const job: NewUploadJob = {
      localUri: input.localUri,
      angle: input.angle,
      swingHand: input.swingHand,
      clubType: input.clubType,
      userId: input.userId,
    };
    enqueue(job);
  }
  return fail(error);
}

function errMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return undefined;
}

