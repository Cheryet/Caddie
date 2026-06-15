/**
 * permissions — Utility
 * Single-source wrapper around iOS permission flows we depend on. Today
 * that's camera and microphone (consumed by CameraScreen). Re-exports
 * Vision Camera's permission hooks so feature code never imports the
 * SDK directly — if we ever swap the camera library, this file is the
 * one and only seam.
 *
 * `openAppSettings` deep-links into the iOS Settings page for Caddie,
 * used when the user has previously denied a permission and must
 * re-grant it manually (RN's permission APIs cannot re-prompt after
 * a hard "Don't Allow").
 *
 * Spec: PROJECT_SPEC.md §22 Phase 1.2.
 */

import { Linking } from 'react-native';
import {
  useCameraPermission as visionCameraUseCameraPermission,
  useMicrophonePermission as visionCameraUseMicrophonePermission,
} from 'react-native-vision-camera';
import type { PermissionStatus } from 'react-native-vision-camera';

export type { PermissionStatus };
export type { PermissionState } from 'react-native-vision-camera/lib/hooks/usePermission';

/**
 * Subscribe to the camera permission. Returns the current status plus
 * `requestPermission()` for the in-app prompt and a derived
 * `hasPermission` boolean for branching in JSX.
 */
export const useCameraPermission = visionCameraUseCameraPermission;

/** Subscribe to the microphone permission. See {@linkcode useCameraPermission}. */
export const useMicrophonePermission = visionCameraUseMicrophonePermission;

/**
 * Open the iOS Settings app on Caddie's page. The OS returns the user
 * here when they tap "Open Settings" on a denied-permission screen so
 * they can flip the toggle manually.
 *
 * Resolves once the OS has accepted the request to switch apps — does
 * NOT wait for the user to return. Failures resolve silently in
 * production; we log in dev so a missing capability is obvious.
 */
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (err) {
    if (__DEV__) {
      console.warn('[permissions] openSettings failed', err);
    }
  }
}
