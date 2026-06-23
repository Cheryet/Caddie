/**
 * caddie-trim — Public surface
 * Thin wrapper around the `CaddieTrim` native module. Exists as its own
 * RN package so the app can autolink the iOS pod without touching the
 * main Caddie target's pbxproj (mirrors caddie-pose).
 *
 * Consumed by `src/core/trim/client.ts`, the only file outside this
 * package that should import from here — the rest of the app talks to
 * `@/core/trim`.
 */

import { NativeModules } from 'react-native';

import type { TrimResult } from './types';

interface CaddieTrimNativeModule {
  trimVideo(
    inputPath: string,
    startMs: number,
    endMs: number,
  ): Promise<TrimResult>;
}

const native = (NativeModules as { CaddieTrim?: CaddieTrimNativeModule })
  .CaddieTrim;

export { type TrimResult } from './types';

/**
 * Re-encode the [startMs, endMs] slice of a local video to a new mp4 in
 * the temp dir. Rejects if the native module is missing (pod install not
 * run) or the export fails.
 */
export async function trimVideo(
  inputPath: string,
  startMs: number,
  endMs: number,
): Promise<TrimResult> {
  if (!native) {
    throw new Error(
      'CaddieTrim native module not found — did pod install run after package install?',
    );
  }
  return native.trimVideo(inputPath, startMs, endMs);
}
