/**
 * CameraScreen — Screen
 * Full-screen modal presented from the Record FAB. Responsible for
 * requesting camera + microphone permissions and rendering the live
 * preview. Recording controls (capture button, club selector, swing-hand
 * toggle, countdown, guideline overlay) arrive in Phase 1.3 — this
 * phase only proves the gate is open and the preview surface works.
 *
 * Render states:
 *   requesting — initial mount, while we ask the OS. Brief, usually <1s.
 *   denied     — user said no (or had previously). EmptyState with an
 *                "Open Settings" CTA; we cannot re-prompt programmatically
 *                once iOS has hard-denied.
 *   noDevice   — granted but the OS can't find a back camera. iOS
 *                simulators always hit this branch (no hardware).
 *   granted    — live preview from the back camera.
 *
 * Microphone is requested but its denial is non-fatal at this phase —
 * preview works without audio; recording in Phase 1.3 will surface the
 * mic state explicitly.
 *
 * Spec: PROJECT_SPEC.md §22 Phase 1.2.
 */

import { useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

import { EmptyState } from '@/components/ui';
import {
  openAppSettings,
  useCameraPermission,
  useMicrophonePermission,
} from '@/utils/permissions';
import { colors, layout, spacing, typography } from '@/theme';

import type { RootStackScreenProps } from '@/navigation/types';

export function CameraScreen({ navigation }: RootStackScreenProps<'Camera'>) {
  const cameraPermission = useCameraPermission();
  const microphonePermission = useMicrophonePermission();
  const device = useCameraDevice('back');

  // Request both permissions on mount. We only attempt the in-app
  // prompt when the OS can still show one (`canRequestPermission`);
  // hard-denied permissions require the user to flip a toggle in
  // Settings, which the denied UI below explains.
  useEffect(() => {
    if (cameraPermission.canRequestPermission) {
      cameraPermission.requestPermission();
    }
    if (microphonePermission.canRequestPermission) {
      microphonePermission.requestPermission();
    }
  }, [cameraPermission, microphonePermission]);

  const close = () => navigation.goBack();

  // ───── Denied — system has hard-denied; only Settings can unblock. ─────
  // We treat camera as the gating permission. Microphone denial is
  // surfaced in Phase 1.3 when it actually matters.
  if (
    !cameraPermission.hasPermission &&
    !cameraPermission.canRequestPermission
  ) {
    return (
      <View style={styles.container}>
        <Header onClose={close} />
        <EmptyState
          icon="video.slash"
          title="Camera access needed"
          body="Caddie can't record swings without the camera. Enable it in Settings to continue."
          actionLabel="Open Settings"
          onAction={openAppSettings}
        />
      </View>
    );
  }

  // ───── Requesting — brief; usually flips to granted within ~500ms. ─────
  if (!cameraPermission.hasPermission) {
    return (
      <View style={styles.container}>
        <Header onClose={close} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold.default} />
        </View>
      </View>
    );
  }

  // ───── Granted but no device — iOS simulator + edge cases. ─────────────
  if (!device) {
    return (
      <View style={styles.container}>
        <Header onClose={close} />
        <EmptyState
          icon="exclamationmark.triangle"
          title="No camera available"
          body="Caddie couldn't find a camera on this device. Run on a physical iPhone to record swings."
        />
      </View>
    );
  }

  // ───── Granted — live preview. Recording UI lands in Phase 1.3. ────────
  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
      />
      <View style={styles.headerOverlay}>
        <Header onClose={close} />
      </View>
    </View>
  );
}

interface HeaderProps {
  onClose: () => void;
}

function Header({ onClose }: HeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close camera">
        <Text style={styles.close}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[10],
    paddingBottom: spacing[3],
  },
  // Absolute overlay so the close button floats over the live preview
  // without pushing it down.
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  close: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
