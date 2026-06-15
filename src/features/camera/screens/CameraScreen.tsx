/**
 * CameraScreen — Screen
 * Full-screen modal presented from the Record FAB. Drives the swing-
 * capture flow per Design/Caddie Screens.dc.html (CameraScreen, lines
 * 290–390) and PROJECT_SPEC.md §4 MVP video capture.
 *
 * Render branches:
 *   denied     — system has hard-denied; EmptyState + Open Settings
 *   requesting — permission prompt in flight
 *   noDevice   — granted but no back camera (iOS simulator)
 *   ready/recording — live preview + capture chrome
 *
 * Capture state machine (within the ready branch):
 *   idle → countdown (if enabled) → recording → stopping → navigate
 *
 * Recording produces a temporary filesystem path. We hand it off to the
 * Playback route as a local URI plus the capture metadata (angle, club,
 * swing hand). Phase 1.4 picks the file up for compression + upload.
 *
 * Spec: PROJECT_SPEC.md §22 Phase 1.3.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Camera,
  useCameraDevice,
  useVideoOutput,
} from 'react-native-vision-camera';
import type { Recorder } from 'react-native-vision-camera';

import { EmptyState } from '@/components/ui';
import { MAX_RECORDING_DURATION_SEC } from '@/constants/config';
import {
  COUNTDOWN_DURATION_SEC,
  DEFAULT_CAMERA_ANGLE,
  DEFAULT_SWING_HAND,
} from '@/constants/camera';
import type { CameraAngle, SwingHand } from '@/constants/camera';
import { CLUBS, DEFAULT_CLUB } from '@/constants/clubs';
import type { ClubType } from '@/constants/clubs';
import { mmkv } from '@/core/mmkv/client';
import {
  openAppSettings,
  useCameraPermission,
  useMicrophonePermission,
} from '@/utils/permissions';
import { colors, layout, spacing } from '@/theme';

import {
  CameraFlipIcon,
  CloseIcon,
  GridIcon,
  HandIcon,
} from '../components/CameraIcons';

import type { RootStackScreenProps } from '@/navigation/types';

type CaptureMode = 'idle' | 'countdown' | 'recording' | 'stopping';

const LAST_CLUB_KEY = 'camera.lastClub';

/**
 * Read the most recently used club from MMKV, falling back to the
 * canonical default. Validates against the current CLUBS list — a
 * removed club from a previous build resets to default.
 */
function loadLastClub(): ClubType {
  const raw = mmkv.getString(LAST_CLUB_KEY);
  if (raw && (CLUBS as readonly string[]).includes(raw)) {
    return raw as ClubType;
  }
  return DEFAULT_CLUB;
}

export function CameraScreen({ navigation }: RootStackScreenProps<'Camera'>) {
  const cameraPermission = useCameraPermission();
  const microphonePermission = useMicrophonePermission();
  const device = useCameraDevice('back');
  const videoOutput = useVideoOutput({
    targetResolution: { width: 1920, height: 1080 },
    enableAudio: true,
  });

  const [angle, setAngle] = useState<CameraAngle>(DEFAULT_CAMERA_ANGLE);
  const [swingHand, setSwingHand] = useState<SwingHand>(DEFAULT_SWING_HAND);
  const [club, setClub] = useState<ClubType>(loadLastClub);
  const [showGuides, setShowGuides] = useState(true);
  const [mode, setMode] = useState<CaptureMode>('idle');
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_DURATION_SEC);
  const [elapsedSec, setElapsedSec] = useState(0);

  const recorderRef = useRef<Recorder | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request both permissions on mount (Phase 1.2 contract).
  useEffect(() => {
    if (cameraPermission.canRequestPermission) {
      cameraPermission.requestPermission();
    }
    if (microphonePermission.canRequestPermission) {
      microphonePermission.requestPermission();
    }
  }, [cameraPermission, microphonePermission]);

  // Persist club selection. PROJECT_SPEC.md §4 line 62 — "persists last
  // selection".
  useEffect(() => {
    mmkv.set(LAST_CLUB_KEY, club);
  }, [club]);

  // Cancel any pending timers if the screen unmounts mid-flow.
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  // ───── Recording lifecycle ─────────────────────────────────────────────

  const handleRecordingFinished = useCallback(
    (filePath: string) => {
      // Stop the elapsed timer immediately — the modal is about to unmount.
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      recorderRef.current = null;
      navigation.replace('Playback', {
        localUri: filePath,
        angle,
        clubType: club,
        swingHand,
      });
    },
    [angle, club, navigation, swingHand],
  );

  const handleRecordingError = useCallback((err: Error) => {
    if (__DEV__) {
      console.warn('[CameraScreen] recording failed', err);
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
    recorderRef.current = null;
    setMode('idle');
    setElapsedSec(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const recorder = await videoOutput.createRecorder({
        maxDuration: MAX_RECORDING_DURATION_SEC,
      });
      recorderRef.current = recorder;
      setMode('recording');
      setElapsedSec(0);
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSec(prev => prev + 1);
      }, 1000);
      await recorder.startRecording(
        handleRecordingFinished,
        handleRecordingError,
      );
    } catch (err) {
      handleRecordingError(err as Error);
    }
  }, [handleRecordingError, handleRecordingFinished, videoOutput]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setMode('stopping');
    try {
      await recorder.stopRecording();
      // The onRecordingFinished callback handles the navigation; nothing
      // else to do here.
    } catch (err) {
      handleRecordingError(err as Error);
    }
  }, [handleRecordingError]);

  // ───── Countdown ───────────────────────────────────────────────────────

  const beginCountdown = useCallback(() => {
    setCountdownValue(COUNTDOWN_DURATION_SEC);
    setMode('countdown');
    countdownTimerRef.current = setInterval(() => {
      setCountdownValue(prev => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startRecording]);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setMode('idle');
  }, []);

  const handleRecordPress = useCallback(() => {
    if (mode === 'idle') {
      beginCountdown();
    } else if (mode === 'recording') {
      stopRecording();
    } else if (mode === 'countdown') {
      cancelCountdown();
    }
  }, [beginCountdown, cancelCountdown, mode, stopRecording]);

  const close = useCallback(() => {
    if (mode === 'countdown') {
      cancelCountdown();
    }
    navigation.goBack();
  }, [cancelCountdown, mode, navigation]);

  // ───── Permission branches (Phase 1.2 carry-over) ──────────────────────

  if (
    !cameraPermission.hasPermission &&
    !cameraPermission.canRequestPermission
  ) {
    return (
      <View style={styles.container}>
        <TopBar onClose={close} statusLabel="Off" disabled />
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

  if (!cameraPermission.hasPermission) {
    return (
      <View style={styles.container}>
        <TopBar onClose={close} statusLabel="Off" disabled />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.gold.default} />
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <TopBar onClose={close} statusLabel="Off" disabled />
        <EmptyState
          icon="exclamationmark.triangle"
          title="No camera available"
          body="Caddie couldn't find a camera on this device. Run on a physical iPhone to record swings."
        />
      </View>
    );
  }

  // ───── Capture surface ─────────────────────────────────────────────────

  const isRecording = mode === 'recording' || mode === 'stopping';
  const controlsLocked = mode !== 'idle';
  const statusLabel = isRecording
    ? formatElapsed(elapsedSec)
    : mode === 'countdown'
      ? 'Get ready'
      : 'Ready';

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        outputs={[videoOutput]}
      />

      {showGuides && !isRecording ? <GuidelineOverlay /> : null}

      <View style={styles.topScrim} pointerEvents="none" />

      <TopBar
        onClose={close}
        statusLabel={statusLabel}
        statusActive={isRecording}
        onToggleGuides={() => setShowGuides(prev => !prev)}
        guidesOn={showGuides}
      />

      {!isRecording && mode !== 'countdown' ? (
        <View style={styles.headerSegments}>
          <AngleSegmented
            value={angle}
            onChange={setAngle}
            disabled={controlsLocked}
          />
          <HandSegmented
            value={swingHand}
            onChange={setSwingHand}
            disabled={controlsLocked}
          />
        </View>
      ) : null}

      <View style={styles.bottomChrome}>
        {!isRecording && mode !== 'countdown' ? (
          <ClubChips value={club} onChange={setClub} />
        ) : null}
        <RecordRow
          mode={mode}
          onRecordPress={handleRecordPress}
        />
      </View>

      {mode === 'countdown' ? <Countdown value={countdownValue} /> : null}
    </View>
  );
}

// ───── Subcomponents ────────────────────────────────────────────────────

interface TopBarProps {
  onClose: () => void;
  statusLabel: string;
  statusActive?: boolean;
  /** When true, the top bar is decorative (e.g. permission gates). */
  disabled?: boolean;
  onToggleGuides?: () => void;
  guidesOn?: boolean;
}

function TopBar({
  onClose,
  statusLabel,
  statusActive,
  disabled,
  onToggleGuides,
  guidesOn,
}: TopBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + spacing[3] }]}>
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close camera"
        style={styles.topButton}>
        <CloseIcon color={colors.text.primary} />
      </Pressable>
      <View
        style={[styles.statusPill, statusActive && styles.statusPillActive]}>
        <View
          style={[
            styles.statusDot,
            statusActive && styles.statusDotActive,
          ]}
        />
        <Text style={styles.statusLabel}>{statusLabel}</Text>
      </View>
      {disabled ? (
        <View style={styles.topButton} />
      ) : (
        <Pressable
          onPress={onToggleGuides}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityState={{ selected: guidesOn }}
          accessibilityLabel={guidesOn ? 'Hide guides' : 'Show guides'}
          style={styles.topButton}>
          <GridIcon
            color={guidesOn ? colors.gold.default : colors.text.primary}
          />
        </Pressable>
      )}
    </View>
  );
}

interface AngleSegmentedProps {
  value: CameraAngle;
  onChange: (next: CameraAngle) => void;
  disabled?: boolean;
}

function AngleSegmented({ value, onChange, disabled }: AngleSegmentedProps) {
  return (
    <View style={styles.pillRow} accessibilityRole="tablist">
      <PillTab
        label="Face-on"
        active={value === 'face-on'}
        onPress={() => onChange('face-on')}
        disabled={disabled}
      />
      <PillTab
        label="DTL"
        active={value === 'dtl'}
        onPress={() => onChange('dtl')}
        disabled={disabled}
      />
    </View>
  );
}

interface HandSegmentedProps {
  value: SwingHand;
  onChange: (next: SwingHand) => void;
  disabled?: boolean;
}

function HandSegmented({ value, onChange, disabled }: HandSegmentedProps) {
  return (
    <View style={styles.handRow} accessibilityRole="tablist">
      <HandIcon color="rgba(240,237,232,0.7)" />
      <View style={styles.handTabs}>
        <PillTab
          label="Right"
          active={value === 'right'}
          onPress={() => onChange('right')}
          disabled={disabled}
          height={30}
        />
        <PillTab
          label="Left"
          active={value === 'left'}
          onPress={() => onChange('left')}
          disabled={disabled}
          height={30}
        />
      </View>
    </View>
  );
}

interface PillTabProps {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Optional height override (HandSegmented uses 30; default 32). */
  height?: number;
}

function PillTab({
  label,
  active,
  onPress,
  disabled,
  height = 32,
}: PillTabProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={[styles.pillTab, { height }]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}>
      {active ? <View style={styles.pillTabActiveBg} /> : null}
      <Text
        style={[
          styles.pillTabLabel,
          active && styles.pillTabLabelActive,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface ClubChipsProps {
  value: ClubType;
  onChange: (next: ClubType) => void;
}

function ClubChips({ value, onChange }: ClubChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipScroll}>
      {CLUBS.map(c => {
        const selected = c === value;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityState={{ selected }}>
            <Text
              style={[
                styles.chipLabel,
                selected && styles.chipLabelSelected,
              ]}>
              {c}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

interface RecordRowProps {
  mode: CaptureMode;
  onRecordPress: () => void;
}

function RecordRow({ mode, onRecordPress }: RecordRowProps) {
  const insets = useSafeAreaInsets();
  const isRecording = mode === 'recording' || mode === 'stopping';
  return (
    <View
      style={[styles.recordRow, { paddingBottom: insets.bottom + spacing[6] }]}>
      <View style={styles.galleryThumb} accessibilityLabel="Recent recording">
        {/* Phase 1.5 wires the actual last-recording thumbnail here. */}
      </View>
      <RecordButton onPress={onRecordPress} active={isRecording} />
      <Pressable
        style={styles.flipButton}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Flip camera">
        {/* Front-camera support deferred — see TODO.md. */}
        <CameraFlipIcon color={colors.text.primary} />
      </Pressable>
    </View>
  );
}

interface RecordButtonProps {
  active: boolean;
  onPress: () => void;
}

function RecordButton({ active, onPress }: RecordButtonProps) {
  // The inner morphs between a 60×60 gold dot (idle) and a smaller red
  // rounded square (recording). Animated via Reanimated so the change
  // feels physical rather than a hard swap.
  const innerScale = useSharedValue(1);
  useEffect(() => {
    innerScale.value = withTiming(active ? 0.55 : 1, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [active, innerScale]);

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={active ? 'Stop recording' : 'Start recording'}
      style={styles.recordButton}>
      <Animated.View
        style={[
          styles.recordButtonInner,
          active && styles.recordButtonInnerActive,
          innerStyle,
        ]}
      />
    </Pressable>
  );
}

interface CountdownProps {
  value: number;
}

function Countdown({ value }: CountdownProps) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  useEffect(() => {
    scale.value = 0.6;
    opacity.value = 0;
    scale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 180 });
  }, [value, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.countdownOverlay} pointerEvents="none">
      <Animated.Text style={[styles.countdownGlyph, style]}>
        {value}
      </Animated.Text>
    </View>
  );
}

function GuidelineOverlay() {
  // Faithful to Design/Caddie Screens.dc.html lines 303-316: four corner
  // brackets, vertical plumb line, ground line, feet target ellipse, and
  // the "STAND ON THE LINE" caption. All decorative (`pointerEvents=none`).
  return (
    <View style={styles.guideOverlay} pointerEvents="none">
      <View style={[styles.cornerBracket, styles.cornerTopLeft]} />
      <View style={[styles.cornerBracket, styles.cornerTopRight]} />
      <View style={[styles.cornerBracket, styles.cornerBottomLeft]} />
      <View style={[styles.cornerBracket, styles.cornerBottomRight]} />
      <View style={styles.plumbLine} />
      <View style={styles.groundLine} />
      <View style={styles.feetTarget} />
      <Text style={styles.guideCaption}>STAND ON THE LINE</Text>
    </View>
  );
}

// ───── Helpers ──────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ───── Styles ────────────────────────────────────────────────────────────

const GUIDE_LINE_COLOR = 'rgba(240,237,232,0.32)';
const GUIDE_LINE_DIM = 'rgba(240,237,232,0.22)';
const GUIDE_LINE_DIMMER = 'rgba(240,237,232,0.2)';
const GUIDE_FEET_BORDER = 'rgba(240,237,232,0.28)';
const GUIDE_CAPTION_COLOR = 'rgba(240,237,232,0.45)';
const CHROME_BG = 'rgba(12,12,12,0.6)';
const CHROME_BORDER = 'rgba(255,255,255,0.1)';
const PILL_INACTIVE_LABEL = 'rgba(240,237,232,0.7)';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topButton: {
    width: 38,
    height: 38,
    borderRadius: layout.borderRadius.full,
    backgroundColor: 'rgba(20,20,20,0.55)',
    borderWidth: 1,
    borderColor: CHROME_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
    paddingHorizontal: spacing[3],
    borderRadius: layout.borderRadius.full,
    backgroundColor: 'rgba(12,12,12,0.5)',
    borderWidth: 1,
    borderColor: CHROME_BORDER,
    gap: 7,
  },
  statusPillActive: {
    backgroundColor: 'rgba(60,12,12,0.6)',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.text.secondary,
  },
  statusDotActive: {
    backgroundColor: colors.semantic.error,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: 'rgba(240,237,232,0.8)',
  },
  headerSegments: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 114 : 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing[2],
  },
  pillRow: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: layout.borderRadius.full,
    backgroundColor: CHROME_BG,
    borderWidth: 1,
    borderColor: CHROME_BORDER,
  },
  pillTab: {
    paddingHorizontal: spacing[4],
    borderRadius: layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  pillTabActiveBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.text.primary,
  },
  pillTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: PILL_INACTIVE_LABEL,
  },
  pillTabLabelActive: {
    color: colors.text.inverse,
  },
  handRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingLeft: 13,
    paddingRight: 5,
    paddingVertical: 3,
    borderRadius: layout.borderRadius.full,
    backgroundColor: CHROME_BG,
    borderWidth: 1,
    borderColor: CHROME_BORDER,
  },
  handTabs: {
    flexDirection: 'row',
    gap: 3,
  },
  // ───── Guideline overlay ─────
  guideOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cornerBracket: {
    position: 'absolute',
    width: 26,
    height: 26,
  },
  cornerTopLeft: {
    top: 88,
    left: 24,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: GUIDE_LINE_COLOR,
  },
  cornerTopRight: {
    top: 88,
    right: 24,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: GUIDE_LINE_COLOR,
  },
  cornerBottomLeft: {
    bottom: 300,
    left: 24,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: GUIDE_LINE_COLOR,
  },
  cornerBottomRight: {
    bottom: 300,
    right: 24,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: GUIDE_LINE_COLOR,
  },
  plumbLine: {
    position: 'absolute',
    left: '50%',
    top: 120,
    bottom: 330,
    width: 1.5,
    backgroundColor: GUIDE_LINE_DIM,
    transform: [{ translateX: -0.75 }],
  },
  groundLine: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 330,
    height: 1.5,
    backgroundColor: GUIDE_LINE_DIMMER,
  },
  feetTarget: {
    position: 'absolute',
    left: '50%',
    bottom: 300,
    width: 130,
    height: 32,
    borderWidth: 1.5,
    borderColor: GUIDE_FEET_BORDER,
    borderRadius: 999,
    transform: [{ translateX: -65 }],
  },
  guideCaption: {
    position: 'absolute',
    bottom: 344,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: GUIDE_CAPTION_COLOR,
  },
  // ───── Bottom chrome ─────
  bottomChrome: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  chipScroll: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[5] + 2,
    gap: 8,
  },
  chip: {
    paddingHorizontal: spacing[4],
    height: 34,
    borderRadius: layout.borderRadius.full,
    borderWidth: 1,
    borderColor: CHROME_BORDER,
    backgroundColor: 'rgba(12,12,12,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: PILL_INACTIVE_LABEL,
  },
  chipLabelSelected: {
    color: colors.text.inverse,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[10],
    paddingTop: spacing[6] + 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  galleryThumb: {
    width: 48,
    height: 48,
    borderRadius: 11,
    backgroundColor: 'rgba(20,20,20,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: layout.borderRadius.full,
    borderWidth: 4,
    borderColor: 'rgba(240,237,232,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.gold.default,
  },
  recordButtonInnerActive: {
    borderRadius: 10,
    backgroundColor: colors.semantic.error,
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: layout.borderRadius.full,
    backgroundColor: 'rgba(20,20,20,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ───── Countdown ─────
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  countdownGlyph: {
    fontSize: 140,
    fontWeight: '700',
    color: colors.gold.default,
    letterSpacing: -4,
  },
});

