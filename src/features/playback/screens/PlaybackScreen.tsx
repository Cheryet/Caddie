/**
 * PlaybackScreen — Screen
 * Mounts the playback surface for either a fresh recording / import
 * (route is `{ localUri, … }`) or a library entry (`{ videoId }`). Per
 * PROJECT_SPEC §22 Phase 1.7: full-bleed video, custom transport chrome,
 * 0.25× / 0.5× / 1× speed, frame-step buttons, auto-hide chrome.
 *
 * Local clips (recordings + imports) open in REVIEW mode: the player
 * starts immediately and a persistent bar offers **Trim** and **Save to
 * library**. Nothing uploads until the user taps Save — so a fluffed take
 * can be discarded, and trimming happens once, before upload ("trim on
 * save", see useTrim). Library videos open straight into viewer mode.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button, Toast } from '@/components/ui';
import { useNetworkStatus } from '@/components/useNetworkStatus';
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
import { usePoseTrack } from '@/features/pose/hooks/usePoseTrack';
import { usePoseStatus } from '@/features/pose/hooks/usePoseStatus';
import { TrimBar } from '@/features/trimming/components/TrimBar';
import { useTrim } from '@/features/trimming/hooks/useTrim';
import type { MaterializedClip } from '@/features/trimming/hooks/useTrim';
import { useAppStore } from '@/store/useAppStore';
import { setVideoDuration, uploadRecording } from '@/utils/upload';
import { formatRelativeDate } from '@/utils/relativeTime';
import { colors, layout, spacing, typography } from '@/theme';
import type { RootStackScreenProps } from '@/navigation/types';

// Bottom padding the review bar occupies; the chrome's transport is lifted
// by this much (extraBottomInset) so the two never overlap.
const REVIEW_BAR_INSET = 64;

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

  const isLocal = 'localUri' in params;
  const localUri = isLocal ? params.localUri : null;

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
    // Pin the chrome (which hosts the DrawingToolbar) whenever the user is
    // annotating — i.e. any tool other than 'none' is selected, or a stroke
    // is in flight. Otherwise the toolbar fades out between strokes, which
    // makes drawing on a swing infuriating. Auto-hide still applies while
    // just watching/scrubbing (tool === 'none'); tapping the video then
    // toggles the chrome back to pick a tool.
    chromeLocked: drawing.isStroking || drawing.tool !== 'none',
  });

  // Trim (recordings + imports only). The bar selects a [start,end]
  // range; the re-encode runs once, in handleSave, via materialize().
  const {
    isOpen: trimOpen,
    range: trimRange,
    hasTrim,
    thumbnails: trimThumbs,
    thumbsStatus: trimThumbsStatus,
    minDurationMs: trimMin,
    open: openTrim,
    close: closeTrim,
    commit: commitTrim,
    materialize: materializeTrim,
  } = useTrim({ uri: localUri, durationMs: playback.durationMs });

  // Pose overlay (Phase 3.2). Off by default; the pill only shows once
  // the on-device engine reports ready. On enable, the whole clip's pose
  // is pre-computed once (usePoseTrack) so the skeleton animates smoothly
  // during playback + scrubbing via an instant frameAt() lookup.
  const [poseEnabled, setPoseEnabled] = useState(false);
  const poseStatus = usePoseStatus();
  const poseTrack = usePoseTrack({
    uri: source.uri,
    enabled: poseEnabled,
  });
  const handleTogglePose = useCallback(() => {
    setPoseEnabled(prev => !prev);
  }, []);

  // Review → saved. Local clips start unsaved (review mode); a saved
  // library video, or a local clip after Save, is in viewer mode.
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isReview = isLocal && !saved;

  // The swing is analysable once it has a saved row id — immediately for a
  // library video, or after Save for a fresh recording. Drives the
  // "Analyse with AI" CTA (Phase 4.4).
  const [analyzableVideoId, setAnalyzableVideoId] = useState<string | null>(
    persistedVideoId,
  );

  // ─── Save: trim (if any) then upload, once ─────────────────────────────
  const handleSave = useCallback(async () => {
    if (!('localUri' in params)) return;
    if (!userId) {
      Toast.show({ message: 'Sign in to save your swing.', variant: 'error' });
      return;
    }
    setIsSaving(true);
    let clip: MaterializedClip;
    try {
      clip = await materializeTrim(params.localUri);
    } catch {
      setIsSaving(false);
      Toast.show({
        message: 'Could not trim the video — try again.',
        variant: 'error',
      });
      return;
    }
    const result = await uploadRecording({
      localUri: clip.uri,
      angle: params.angle,
      clubType: params.clubType,
      swingHand: params.swingHand,
      userId,
      durationMs: clip.durationMs ?? playback.durationMs,
    });
    setIsSaving(false);
    setSaved(true);
    if (result.error) {
      Toast.show({
        message: 'Saved — upload will finish on next launch.',
        variant: 'error',
      });
    } else {
      setAnalyzableVideoId(result.data?.videoId ?? null);
      Toast.show({ message: 'Swing saved.', variant: 'success' });
    }
  }, [params, userId, materializeTrim, playback.durationMs]);

  const handleOpenTrim = useCallback(() => {
    playback.pause();
    openTrim();
  }, [playback, openTrim]);

  // Backfill a LIBRARY video's duration the first time it's played — older
  // rows (and queue-inserted ones) can have a null duration_ms and show
  // 0:00 in the grid. Local saves store the duration at insert, so this is
  // scoped to `videoId` sources and runs once.
  const durationSyncedRef = useRef(false);
  useEffect(() => {
    if (durationSyncedRef.current) return;
    if (!('videoId' in params)) return;
    if (!analyzableVideoId || playback.durationMs <= 0) return;
    durationSyncedRef.current = true;
    setVideoDuration(analyzableVideoId, playback.durationMs).catch(() => {});
  }, [analyzableVideoId, playback.durationMs, params]);

  // Surface a one-off toast if the pose pre-compute fails (e.g. the clip
  // couldn't be downloaded for analysis).
  useEffect(() => {
    if (poseTrack.status === 'error') {
      Toast.show({
        message: 'Could not analyze pose for this swing.',
        variant: 'error',
      });
    }
  }, [poseTrack.status]);

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

  const { isOffline } = useNetworkStatus();
  const handleAnalyse = useCallback(() => {
    if (!analyzableVideoId) return;
    if (isOffline) {
      Toast.show({
        message: "You're offline — connect to analyse your swing.",
        variant: 'error',
      });
      return;
    }
    navigation.navigate('Analysis', { videoId: analyzableVideoId });
  }, [navigation, analyzableVideoId, isOffline]);

  // ─── Body branches ────────────────────────────────────────────────────
  if (source.error) {
    return (
      <PlaybackErrorView message={source.error.message} onBack={handleBack} />
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
            // Drive progress at ~30fps while the skeleton is live so it
            // animates smoothly; back to 10fps otherwise.
            progressUpdateIntervalMs={poseTrack.status === 'ready' ? 33 : 100}
            onLoadedDurationMs={playback.setDuration}
            onProgressMs={playback.setProgress}
            onEnd={playback.onEnd}
          />
        </Pressable>

        {/* Pose skeleton sits above the video, below the drawing layer
            so annotations draw over it. Purely visual (pointerEvents
            none), so it never steals taps from the player or canvas. The
            pose for the current time is an instant lookup into the
            pre-computed track, so it animates with playback. */}
        <PoseOverlay
          frame={poseTrack.frameAt(playback.currentMs)}
          canvasSize={drawing.canvasSize}
        />

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
        visible={playback.chromeVisible && !trimOpen}
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
        onAnalyse={analyzableVideoId ? handleAnalyse : undefined}
        extraBottomInset={isReview && !trimOpen ? REVIEW_BAR_INSET : 0}
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

      {/* Review actions (recordings + imports, pre-save). Persistent so
          Save is always reachable; replaced by the TrimBar while trimming. */}
      {isReview && !trimOpen ? (
        <View style={styles.bottomDock}>
          <ReviewActionBar
            hasTrim={hasTrim}
            saving={isSaving}
            onTrim={handleOpenTrim}
            onSave={handleSave}
          />
        </View>
      ) : null}

      {isReview && trimOpen ? (
        <View style={styles.bottomDock}>
          <TrimBar
            durationMs={playback.durationMs}
            thumbnails={trimThumbs}
            thumbsStatus={trimThumbsStatus}
            initialRange={trimRange}
            minDurationMs={trimMin}
            onSeekMs={playback.seekMs}
            onCancel={closeTrim}
            onApply={commitTrim}
          />
        </View>
      ) : null}

      {poseTrack.status === 'analyzing' ? (
        <PoseAnalyzingOverlay elapsedSec={poseTrack.elapsedSec} />
      ) : null}
    </View>
  );
}

// ───── Subviews ──────────────────────────────────────────────────────────

interface ReviewActionBarProps {
  hasTrim: boolean;
  saving: boolean;
  onTrim: () => void;
  onSave: () => void;
}

function ReviewActionBar({
  hasTrim,
  saving,
  onTrim,
  onSave,
}: ReviewActionBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.reviewBar, { paddingBottom: insets.bottom + spacing[3] }]}
    >
      <Pressable
        onPress={onTrim}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel={hasTrim ? 'Edit trim' : 'Trim swing'}
        style={styles.trimBtn}
        hitSlop={6}
      >
        <ScissorsIcon active={hasTrim} />
        <Text
          style={[styles.trimBtnLabel, hasTrim && styles.trimBtnLabelActive]}
        >
          {hasTrim ? 'Edit trim' : 'Trim'}
        </Text>
      </Pressable>
      <View style={styles.saveWrap}>
        <Button
          label="Save to library"
          variant="primary"
          onPress={onSave}
          loading={saving}
          shadow
          fullWidth
        />
      </View>
    </View>
  );
}

interface PoseAnalyzingOverlayProps {
  elapsedSec: number;
}

function PoseAnalyzingOverlay({ elapsedSec }: PoseAnalyzingOverlayProps) {
  return (
    <View style={styles.analyzeWrap} pointerEvents="none">
      <View style={styles.analyzeCard}>
        <ActivityIndicator size="small" color={colors.gold.default} />
        <Text style={styles.analyzeLabel}>Analyzing pose…</Text>
        <Text style={styles.analyzeSub}>{elapsedSec}s</Text>
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

// ───── Icons ─────────────────────────────────────────────────────────────

// Scissors — standard two-ring scissors (trim isn't in the Design bundle,
// so this is a clean stock glyph, not a substituted design icon). Gold
// when a trim is applied, neutral otherwise.
function ScissorsIcon({ active }: { active: boolean }) {
  const stroke = active ? colors.gold.default : colors.text.primary;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={6} cy={6} r={3} stroke={stroke} strokeWidth={2} />
      <Circle cx={6} cy={18} r={3} stroke={stroke} strokeWidth={2} />
      <Path
        d="M20 4L8.12 15.88"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.47 14.48L20 20"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.12 8.12L12 12"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
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
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  reviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingTop: spacing[3],
    paddingHorizontal: layout.screenPaddingH,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  trimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    height: 48,
    paddingHorizontal: spacing[4],
    borderRadius: layout.borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: 'rgba(20,20,20,0.65)',
  },
  trimBtnLabel: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  trimBtnLabelActive: {
    color: colors.gold.text,
  },
  saveWrap: {
    flex: 1,
  },
  analyzeWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: 999,
    backgroundColor: 'rgba(20,20,20,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  analyzeLabel: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  analyzeSub: {
    fontFamily: typography.dataSmall.fontFamily,
    fontSize: 12,
    color: colors.text.secondary,
  },
});
