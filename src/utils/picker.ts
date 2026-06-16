/**
 * picker — Utility
 * Single wrapper around `react-native-image-picker`'s `launchImageLibrary`
 * for the photo-library import flow. Mirrors the `{data, error}` shape
 * the rest of the codebase uses (auth.ts, storage.ts) so feature hooks
 * don't have to special-case picker errors.
 *
 * The 60-second cap is enforced here: anything longer is rejected with
 * a `too_long` error so the consuming hook can show a toast without
 * having to re-implement the check. The cap mirrors recording's
 * MAX_RECORDING_DURATION_SEC to keep the two paths in agreement.
 *
 * Spec: PROJECT_SPEC.md §22 Phase 1.6.
 */

import { launchImageLibrary } from 'react-native-image-picker';

import { MAX_RECORDING_DURATION_SEC } from '@/constants/config';

export interface PickedVideo {
  uri: string;
  durationSec: number;
  fileName: string | null;
}

export type PickErrorCode =
  | 'cancelled'
  | 'permission_denied'
  | 'too_long'
  | 'no_video'
  | 'unknown';

export interface PickError {
  code: PickErrorCode;
  message: string;
}

export interface PickResult {
  data: PickedVideo | null;
  error: PickError | null;
}

function ok(data: PickedVideo): PickResult {
  return { data, error: null };
}

function fail(error: PickError): PickResult {
  return { data: null, error };
}

/**
 * Present iOS PHPicker for selecting a single video. The user can also
 * cancel — that yields `error.code === 'cancelled'` so callers can no-op
 * silently.
 *
 * On iOS 14+ PHPicker doesn't require photo-library permission (Apple
 * sandboxes selection through the system UI), so a denial branch is
 * rare in practice — but we still surface it for older OS fallbacks.
 */
export async function pickVideo(): Promise<PickResult> {
  const response = await launchImageLibrary({
    mediaType: 'video',
    selectionLimit: 1,
    includeBase64: false,
    // PHPicker on iOS 14+ defaults to scoped access — no full library
    // permission required. Leave videoQuality undefined so the original
    // asset URI is returned (we re-compress in the upload pipeline).
  });

  if (response.didCancel) {
    return fail({ code: 'cancelled', message: 'Picker dismissed.' });
  }
  if (response.errorCode === 'permission') {
    return fail({
      code: 'permission_denied',
      message: 'Photo library access is required to import a swing.',
    });
  }
  if (response.errorCode || !response.assets || response.assets.length === 0) {
    return fail({
      code: 'unknown',
      message: response.errorMessage ?? 'Could not load that video.',
    });
  }

  const asset = response.assets[0];
  if (!asset?.uri) {
    return fail({ code: 'no_video', message: 'No video was returned.' });
  }

  // `asset.duration` is in seconds on iOS (per react-native-image-picker
  // docs). Missing means we couldn't read it — treat as unknown so the
  // user isn't blocked by a flaky metadata read.
  const duration = typeof asset.duration === 'number' ? asset.duration : null;
  if (duration !== null && duration > MAX_RECORDING_DURATION_SEC) {
    return fail({
      code: 'too_long',
      message: `Pick a swing under ${MAX_RECORDING_DURATION_SEC} seconds.`,
    });
  }

  return ok({
    uri: asset.uri,
    durationSec: duration ?? 0,
    fileName: asset.fileName ?? null,
  });
}
