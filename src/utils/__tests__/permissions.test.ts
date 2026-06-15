/**
 * permissions — utility tests
 * Verifies the re-exports point at Vision Camera's hooks and that
 * `openAppSettings` calls through to React Native's Linking.openSettings.
 * The Vision Camera module is stubbed in jest.setup.js so these tests
 * never touch a native module.
 */

import { Linking } from 'react-native';

import {
  openAppSettings,
  useCameraPermission,
  useMicrophonePermission,
} from '../permissions';

describe('permissions util', () => {
  it('re-exports useCameraPermission from vision-camera', () => {
    const visionCamera = require('react-native-vision-camera');
    expect(useCameraPermission).toBe(visionCamera.useCameraPermission);
  });

  it('re-exports useMicrophonePermission from vision-camera', () => {
    const visionCamera = require('react-native-vision-camera');
    expect(useMicrophonePermission).toBe(visionCamera.useMicrophonePermission);
  });

  it('openAppSettings calls Linking.openSettings', async () => {
    const spy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await openAppSettings();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('openAppSettings swallows errors silently', async () => {
    const spy = jest
      .spyOn(Linking, 'openSettings')
      .mockRejectedValue(new Error('not supported'));
    await expect(openAppSettings()).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
