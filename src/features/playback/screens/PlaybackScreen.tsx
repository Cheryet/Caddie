/**
 * PlaybackScreen — Screen
 * Mounts the playback surface for either a fresh recording (route is
 * `{ localUri, … }`) or a library entry (`{ videoId }`). Per PROJECT_
 * SPEC §22 Phase 1.7: full-bleed video, custom transport chrome,
 * 0.25× / 0.5× / 1× speed, frame-step buttons, auto-hide chrome.
 *
 * Post-recording behavior (Phase 1.6 decision): the player starts
 * IMMEDIATELY; `uploadRecording` runs in parallel and surfaces its
 * status as a small pill in the top bar. The user can review their
 * swing without waiting for the upload.
 *
 * Drawing toolbar, pose toggle, "Analyse with AI" CTA, and the impact
 * frame marker on the scrub track are deliberately deferred to later
 * phases — see TODO.md.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast } from '@/components/ui';
import { DrawingCanvas } from '@/features/drawing/components/DrawingCanvas';
import { DrawingToolbar } from '@/features/drawing/components/DrawingToolbar';
import { useDrawing } from '@/features/drawing/hooks/useDrawing';
import { useDrawingPersistence } from '@/features/drawing/hooks/useDrawingPersistence';
import { PlaybackChrome } from '@/features/playback/components/PlaybackChrome';
import { VideoPlayer } from '@/features/playback/components/VideoPlayer';
import type { VideoPlayerHandle } from '@/features/playback/components/VideoPlayer';
import { useVideoSource } from '@/features/playback/hooks/useVideoSource';
import { usePlayback } from '@/features/playback/hooks/usePlayback';
import { useShareSwing } from '@/features/playback/hooks/useShareSwing';
import { PoseOverlay } from '@/features/pose/components/PoseOverlay';
import { usePoseFrame } from '@/features/pose/hooks/usePoseFrame';
import { usePoseStatus } from '@/features/pose/hooks/usePoseStatus';
import { useAppStore } from '@/store/useAppStore';
import { uploadRecording } from '@/utils/upload';
import { formatRelativeDate } from '@/utils/relativeTime';
import { colors, spacing, typography } from '@/theme';
import type { RootStackScreenProps } from '@/navigation/types';

type UploadStatus =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'uploaded' }
  | { kind: 'failed' };

export function PlaybackScreen({
  navigation,
  route,
}: RootStackScreenProps<'Playback'>) {
  const userId = useAppStore(s => s.user?.id ?? null);
  const params = route.params;
  const source = useVideoSource(params);
  const playerRef = useRef<VideoPlayerHandle>(null);
  // Capture target: a single View wrapping the video + canvas. The
  // share flow snapshots this ref via react-native-view-shot so the
  // exported JPEG includes both the current frame and the overlay.
  const captureRef = useRef<View>(null);

  // Drawing canvas state (Phase 2.2). Declared before usePlayback so
  // we can lock the chrome visible while a stroke is in flight.
  const drawing = useDrawing();
  // Persistence (Phase 2.4) — loads saved drawings on mount when this
  // is a library video; debounce-writes on any shapes change.
  const persistedVideoId = 'videoId' in params ? params.videoId : null;
  useDrawingPersistence({
    videoId: persistedVideoId,
    canvasSize: drawing.canvasSize,
    shapes: drawing.shapes,
    onLoaded: drawing.hydrate,
  });
  // Share (Phase 2.4) — captures the player+canvas into a JPEG and
  // opens the iOS share sheet.
  const shareSwing = useShareSwing(captureRef);

  const playback = usePlayback({
    onSeek: (timeSec: number) => playerRef.current?.seek(timeSec),
    // Chrome stays visible while:
    //   1. The user is mid-stroke (so controls don't fade out
    //      from under their finger).
    //   2. Angle tool is active. Angle is the one drawing tool that
    //      genuinely needs every tap (3-tap placement), so the
    //      tap-to-toggle-chrome chain can't reach. Locking the
    //      chrome up means the toolbar stays reachable for the user
    //      to switch tools and exit.
    chromeLocked: drawing.isStroking || drawing.tool === 'angle',
  });

  // Pose overlay (Phase 3.2). Off by default; the pill only shows once
  // the on-device engine reports ready. Detection runs on the current
  // frame (debounced) while enabled — see usePoseFrame.
  const [poseEnabled, setPoseEnabled] = useState(false);
  const poseStatus = usePoseStatus();
  const poseFrame = usePoseFrame({
    uri: source.uri,
    currentMs: playback.currentMs,
    enabled: poseEnabled,
  });
  const handleTogglePose = useCallback(() => {
    setPoseEnabled(prev => !prev);
  }, []);

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ kind: 'idle' });

  // ─── Background upload for fresh recordings ────────────────────────────
  // Mirrors the previous behavior of this screen but no longer blocks
  // the player surface — the upload runs in parallel.
  useEffect(() => {
    if (!('localUri' in params)) return;
    if (!userId) {
      setUploadStatus({ kind: 'failed' });
      return;
    }
    let cancelled = false;
    setUploadStatus({ kind: 'uploading' });
    (async () => {
      const result = await uploadRecording({
        localUri: params.localUri,
        angle: params.angle,
        clubType: params.clubType,
        swingHand: params.swingHand,
        userId,
      });
      if (cancelled) return;
      if (result.error) {
        setUploadStatus({ kind: 'failed' });
        Toast.show({
          message: 'Upload queued — will retry on next launch.',
          variant: 'error',
        });
      } else {
        setUploadStatus({ kind: 'uploaded' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, userId]);

  // ─── Title strip ──────────────────────────────────────────────────────
  const title = source.meta?.clubType ?? source.meta?.title ?? 'Swing';
  const subtitle = source.meta
    ? formatRelativeDate(source.meta.createdAt) || 'Just now'
    : '';

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleShare = useCallback(() => {
    shareSwing.share().catch(() => {
      // Errors are toasted inside the hook; nothing more to do here.
    });
  }, [shareSwing]);

  // ─── Body branches ────────────────────────────────────────────────────
  if (source.error) {
    return (
      <PlaybackErrorView
        message={source.error.message}
        onBack={handleBack}
      />
    );
  }

  if (!source.uri) {
    return <PlaybackLoadingView onBack={handleBack} />;
  }

  return (
    <View style={styles.root}>
      {/* `captureRef` wraps player + canvas so view-shot captures
          both layers in a single JPEG (Phase 2.4 share). The
          Pressable's onPress still fires through to the player
          tap-to-toggle behaviour. */}
      <View ref={captureRef} style={styles.playerWrap} collapsable={false}>
        <Pressable onPress={playback.toggleChrome} style={styles.playerWrap}>
          <VideoPlayer
            ref={playerRef}
            uri={source.uri}
            paused={!playback.isPlaying}
            rate={playback.rate}
            onLoadedDurationMs={playback.setDuration}
            onProgressMs={playback.setProgress}
            onEnd={playback.onEnd}
          />
        </Pressable>

        {/* Pose skeleton sits above the video, below the drawing layer
            so annotations draw over it. Purely visual (pointerEvents
            none), so it never steals taps from the player or canvas. */}
        <PoseOverlay frame={poseFrame.frame} canvasSize={drawing.canvasSize} />

        {/* Drawing layer sits above the player, below the chrome. When
            no tool is selected it's transparent to touches so the
            tap-to-toggle-chrome behavior is preserved. */}
        <DrawingCanvas
          enabled={drawing.enabled}
          tool={drawing.tool}
          shapes={drawing.shapes}
          inProgress={drawing.inProgress}
          onStrokeStart={drawing.onStrokeStart}
          onStrokeMove={drawing.onStrokeMove}
          onStrokeEnd={drawing.onStrokeEnd}
          selectedShapeId={drawing.selectedShapeId}
          onSize={drawing.setCanvasSize}
          // Tool-aware tap chain: Angle / Select consume the tap; other
          // tools fall through and chrome toggles via `onTap`.
          onCanvasTap={drawing.onCanvasTap}
          onTap={playback.toggleChrome}
        />
      </View>

      <PlaybackChrome
        visible={playback.chromeVisible}
        title={title}
        subtitle={subtitle}
        onBack={handleBack}
        onShare={handleShare}
        isPlaying={playback.isPlaying}
        currentMs={playback.currentMs}
        durationMs={playback.durationMs}
        onToggle={playback.toggle}
        onStepPrev={() => playback.stepFrame('prev')}
        onStepNext={() => playback.stepFrame('next')}
        onSeekMs={playback.seekMs}
        rate={playback.rate}
        onRate={playback.setRate}
        poseAvailable={poseStatus.status === 'ready'}
        poseEnabled={poseEnabled}
        onTogglePose={handleTogglePose}
      >
        <DrawingToolbar
          tool={drawing.tool}
          onToolChange={drawing.setTool}
          canUndo={drawing.shapes.length > 0}
          onUndo={drawing.undo}
          color={drawing.color}
          onColorChange={drawing.setColor}
          canDelete={drawing.selectedShapeId !== null}
          onDelete={drawing.deleteSelected}
        />
      </PlaybackChrome>

      {uploadStatus.kind === 'uploading' || uploadStatus.kind === 'failed' ? (
        <UploadStatusPill status={uploadStatus} visible={playback.chromeVisible} />
      ) : null}
    </View>
  );
}

// ───── Subviews ──────────────────────────────────────────────────────────

interface UploadStatusPillProps {
  status: UploadStatus;
  visible: boolean;
}

function UploadStatusPill({ status, visible }: UploadStatusPillProps) {
  const insets = useSafeAreaInsets();
  if (!visible || status.kind === 'idle' || status.kind === 'uploaded') return null;
  const label =
    status.kind === 'uploading' ? 'Uploading…' : 'Upload failed';
  return (
    <View
      style={[
        styles.pillWrap,
        { top: insets.top + spacing[12] + spacing[2] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.pill}>
        {status.kind === 'uploading' ? (
          <ActivityIndicator
            size="small"
            color={colors.gold.default}
            style={styles.pillSpinner}
          />
        ) : null}
        <Text style={styles.pillLabel}>{label}</Text>
      </View>
    </View>
  );
}

interface PlaybackErrorViewProps {
  message: string;
  onBack: () => void;
}

function PlaybackErrorView({ message, onBack }: PlaybackErrorViewProps) {
  return (
    <View style={[styles.root, styles.centered]}>
      <Text style={styles.errorTitle}>Could not load swing</Text>
      <Text style={styles.errorBody}>{message}</Text>
      <Pressable onPress={onBack} style={styles.errorBack}>
        <Text style={styles.errorBackLabel}>Close</Text>
      </Pressable>
    </View>
  );
}

interface PlaybackLoadingViewProps {
  onBack: () => void;
}

function PlaybackLoadingView({ onBack }: PlaybackLoadingViewProps) {
  return (
    <View style={[styles.root, styles.centered]}>
      <ActivityIndicator color={colors.gold.default} />
      <Pressable
        onPress={onBack}
        style={styles.errorBack}
        accessibilityRole="button"
      >
        <Text style={styles.errorBackLabel}>Cancel</Text>
      </Pressable>
    </View>
  );
}

// ───── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.always.black,
  },
  playerWrap: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: spacing[6],
  },
  errorTitle: {
    ...typography.title2,
    color: colors.text.primary,
  },
  errorBody: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorBack: {
    marginTop: spacing[4],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  errorBackLabel: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  pillWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 30,
    paddingHorizontal: spacing[3],
    borderRadius: 999,
    backgroundColor: 'rgba(20,20,20,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillSpinner: {
    marginLeft: -spacing[1],
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
