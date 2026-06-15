/**
 * PlaybackScreen — Screen
 * Placeholder; the real playback UI (scrub, speed, drawing) lands in
 * Phase 1.7. For now this screen has two jobs:
 *   1. When opened with `{ localUri, ... }` (post-recording), kick off
 *      the upload pipeline and surface minimal status text. The user
 *      can close once it's uploaded.
 *   2. When opened with `{ videoId }` (from the library), just show the
 *      id; real playback comes later.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { uploadRecording } from '@/utils/upload';
import { colors, layout, spacing, typography } from '@/theme';

import type { RootStackScreenProps } from '@/navigation/types';

type UploadStatus =
  | { kind: 'idle' }
  | { kind: 'uploading' }
  | { kind: 'uploaded'; videoId: string }
  | { kind: 'failed'; message: string };

export function PlaybackScreen({
  navigation,
  route,
}: RootStackScreenProps<'Playback'>) {
  const params = route.params;
  const userId = useAppStore(s => s.user?.id ?? null);
  const [status, setStatus] = useState<UploadStatus>({ kind: 'idle' });

  // Fire the upload pipeline when this screen is mounted post-recording.
  // The dependency list is intentionally narrow — `params` reference
  // doesn't change while the screen is mounted (each navigation creates
  // a fresh instance), so a single-shot effect is correct here.
  useEffect(() => {
    if (!('localUri' in params)) return;
    if (!userId) {
      setStatus({
        kind: 'failed',
        message: 'You must be signed in to upload a swing.',
      });
      return;
    }
    let cancelled = false;
    setStatus({ kind: 'uploading' });
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
        setStatus({ kind: 'failed', message: result.error.message });
      } else if (result.data) {
        setStatus({ kind: 'uploaded', videoId: result.data.videoId });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, userId]);

  const isLocal = 'localUri' in params;
  const headline = isLocal ? 'New swing' : 'Swing';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{headline}</Text>
        <Text style={styles.subtitle}>Playback UI lands in Phase 1.7</Text>
      </View>

      <View style={styles.content}>
        {isLocal ? (
          <UploadStatusView status={status} />
        ) : (
          <Text style={styles.body}>videoId: {params.videoId}</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          label="Close"
          onPress={() => navigation.goBack()}
          variant="secondary"
          fullWidth
        />
      </View>
    </View>
  );
}

interface UploadStatusViewProps {
  status: UploadStatus;
}

function UploadStatusView({ status }: UploadStatusViewProps) {
  if (status.kind === 'uploading') {
    return (
      <View style={styles.statusRow}>
        <ActivityIndicator color={colors.gold.default} />
        <Text style={styles.statusLabel}>Uploading your swing…</Text>
      </View>
    );
  }
  if (status.kind === 'uploaded') {
    return (
      <View>
        <Text style={styles.statusLabel}>Uploaded.</Text>
        <Text style={styles.caption}>videoId: {status.videoId}</Text>
      </View>
    );
  }
  if (status.kind === 'failed') {
    return (
      <View>
        <Text style={[styles.statusLabel, styles.statusFailed]}>
          Upload failed
        </Text>
        <Text style={styles.caption}>{status.message}</Text>
        <Text style={styles.caption}>
          Queued for retry — Caddie will try again next time you open the app.
        </Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
    padding: layout.screenPaddingH,
    paddingTop: spacing[16],
    paddingBottom: spacing[8],
    justifyContent: 'space-between',
  },
  header: {
    gap: spacing[2],
  },
  title: typography.display,
  subtitle: {
    ...typography.label,
    color: colors.text.tertiary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statusLabel: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  statusFailed: {
    color: colors.semantic.error,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
  },
  caption: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
  footer: {
    marginTop: spacing[4],
  },
});
