/**
 * captureFrame — Utility
 * Thin wrapper around `react-native-view-shot`'s `captureRef`. The
 * caller passes the React ref of the View it wants captured (a
 * container wrapping the VideoPlayer + DrawingCanvas) and gets back
 * a file:// URI to a temporary JPEG.
 *
 * Returns `{ data, error }` like every other I/O wrapper in the
 * codebase. Errors are captured + mapped so callers don't have to
 * chase react-native-view-shot's thrown exceptions.
 */

import { captureRef } from 'react-native-view-shot';

export type CaptureErrorCode = 'unknown';

export interface CaptureError {
  code: CaptureErrorCode;
  message: string;
}

export interface CaptureResult {
  data: { uri: string } | null;
  error: CaptureError | null;
}

/** Capture a React Native view by ref into a temp JPEG file. */
export async function captureFrame(
  ref: React.RefObject<unknown>,
): Promise<CaptureResult> {
  try {
    const uri = await captureRef(ref, {
      format: 'jpg',
      quality: 0.9,
      result: 'tmpfile',
    });
    return { data: { uri }, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        code: 'unknown',
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
