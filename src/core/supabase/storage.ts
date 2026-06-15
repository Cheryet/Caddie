/**
 * storage — Core service
 * Typed wrapper around `supabase.storage`. Mirrors auth.ts: every
 * operation returns `{ data, error }` with a small, mapped error union,
 * never throws. Buckets and path conventions match PROJECT_SPEC.md §13:
 *
 *   videos:     private, signed URLs 15-min default. Path {userId}/{uuid}.mp4
 *   thumbnails: public, 1-year cache.                 Path {userId}/{uuid}.jpg
 *
 * Storage RLS gates each bucket on the first path segment matching
 * auth.uid(), so the userId in the path is load-bearing — callers MUST
 * pass their own userId; smuggling someone else's is rejected by the DB.
 *
 * Used by: src/utils/upload.ts (the only consumer outside this folder).
 */

import { SIGNED_URL_TTL_MIN } from '@/constants/config';

import { supabase } from './client';

// ───── Error mapping ─────────────────────────────────────────────────────

export type StorageErrorCode =
  | 'file_too_large'
  | 'mime_type_not_supported'
  | 'unauthorized'
  | 'not_found'
  | 'network'
  | 'unknown';

export interface StorageError {
  code: StorageErrorCode;
  message: string;
}

interface SupabaseStorageError {
  message: string;
  statusCode?: string | number;
  error?: string;
}

function mapError(
  err: SupabaseStorageError | null | undefined,
): StorageError | null {
  if (!err) return null;
  const msg = err.message ?? '';
  const status = String(err.statusCode ?? '');
  if (/payload too large|file size/i.test(msg) || status === '413') {
    return { code: 'file_too_large', message: 'File exceeds the storage limit.' };
  }
  if (/mime type|content type/i.test(msg)) {
    return {
      code: 'mime_type_not_supported',
      message: 'That file type is not allowed.',
    };
  }
  if (/not authorized|unauthorized|jwt/i.test(msg) || status === '401' || status === '403') {
    return { code: 'unauthorized', message: 'You don’t have permission to do that.' };
  }
  if (/not found/i.test(msg) || status === '404') {
    return { code: 'not_found', message: 'That file no longer exists.' };
  }
  if (/network|fetch|timeout/i.test(msg)) {
    return { code: 'network', message: 'Network error. Check your connection.' };
  }
  return { code: 'unknown', message: msg || 'Storage operation failed.' };
}

// ───── Result shape (matches auth.ts) ────────────────────────────────────

export interface StorageResult<T> {
  data: T | null;
  error: StorageError | null;
}

function ok<T>(data: T): StorageResult<T> {
  return { data, error: null };
}

function fail<T>(error: StorageError): StorageResult<T> {
  return { data: null, error };
}

// ───── Path helpers ──────────────────────────────────────────────────────

function videoPath(userId: string, videoId: string): string {
  return `${userId}/${videoId}.mp4`;
}

function thumbnailPath(userId: string, videoId: string): string {
  return `${userId}/${videoId}.jpg`;
}

// React Native's FormData accepts a `{uri, type, name}` object as the
// value — this is how we tell supabase-js to read from the device
// filesystem rather than expecting an in-memory Blob.
function fileFromUri(uri: string, mime: string, name: string): unknown {
  const fd = new FormData();
  // TS doesn't know about RN's expanded FormData value shape.
  fd.append('file', { uri, type: mime, name } as unknown as Blob);
  return fd;
}

// ───── Operations ────────────────────────────────────────────────────────

interface UploadedFile {
  /** Path within the bucket, e.g. `{userId}/{uuid}.mp4`. Stored on the
   *  videos row as `storage_path` / `thumbnail_path`. */
  storagePath: string;
}

interface UploadedThumbnail extends UploadedFile {
  /** Permanent public URL safe to embed in `<Image source={{ uri }} />`. */
  publicUrl: string;
}

/**
 * Upload a compressed swing video to the private `videos` bucket. The
 * caller must have already moved the local file to the path it wants
 * (typically returned from `Video.compress`).
 */
export async function uploadVideo(
  userId: string,
  videoId: string,
  localPath: string,
): Promise<StorageResult<UploadedFile>> {
  const path = videoPath(userId, videoId);
  const body = fileFromUri(localPath, 'video/mp4', `${videoId}.mp4`);
  const { error } = await supabase.storage
    .from('videos')
    .upload(path, body as never, {
      contentType: 'video/mp4',
      upsert: false,
    });
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  return ok({ storagePath: path });
}

/**
 * Upload a thumbnail JPEG to the public `thumbnails` bucket. Returns
 * both the storage path (for the videos row) and a stable public URL
 * (for immediate UI rendering before the videos row commits).
 */
export async function uploadThumbnail(
  userId: string,
  videoId: string,
  localPath: string,
): Promise<StorageResult<UploadedThumbnail>> {
  const path = thumbnailPath(userId, videoId);
  const body = fileFromUri(localPath, 'image/jpeg', `${videoId}.jpg`);
  const { error } = await supabase.storage
    .from('thumbnails')
    .upload(path, body as never, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  const { data } = supabase.storage.from('thumbnails').getPublicUrl(path);
  return ok({ storagePath: path, publicUrl: data.publicUrl });
}

/**
 * Sign a temporary URL for a private video. Default TTL comes from
 * `SIGNED_URL_TTL_MIN` (15 min — playback sessions are short).
 */
export async function getSignedVideoUrl(
  storagePath: string,
  ttlMin = SIGNED_URL_TTL_MIN,
): Promise<StorageResult<{ url: string }>> {
  const ttlSec = ttlMin * 60;
  const { data, error } = await supabase.storage
    .from('videos')
    .createSignedUrl(storagePath, ttlSec);
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  if (!data?.signedUrl) {
    return fail({ code: 'unknown', message: 'No signed URL returned.' });
  }
  return ok({ url: data.signedUrl });
}

/** Remove an uploaded video. Used by cleanup paths and admin tooling. */
export async function deleteVideo(
  storagePath: string,
): Promise<StorageResult<true>> {
  const { error } = await supabase.storage.from('videos').remove([storagePath]);
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  return ok(true);
}

/** Remove an uploaded thumbnail. */
export async function deleteThumbnail(
  storagePath: string,
): Promise<StorageResult<true>> {
  const { error } = await supabase.storage
    .from('thumbnails')
    .remove([storagePath]);
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  return ok(true);
}
