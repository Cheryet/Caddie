/**
 * VideoPlayer — Feature component
 * Thin wrapper around `react-native-video` that:
 *   - exposes a `seek(seconds)` method via forwarded ref so the
 *     `usePlayback` state machine can drive scrubbing imperatively
 *   - normalizes onLoad/onProgress/onEnd into ms-based callbacks the
 *     hook understands (v6's events are in seconds)
 *   - hides the library's built-in controls (we render bespoke chrome)
 *
 * The component owns NO state — props drive everything. This keeps it
 * trivially testable and easy to swap if we ever migrate off
 * react-native-video.
 */

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Video from 'react-native-video';
import type { VideoRef } from 'react-native-video';

interface VideoPlayerProps {
  uri: string;
  paused: boolean;
  /** Playback rate. 1 = normal, 0.5 = half-speed, etc. */
  rate: number;
  /**
   * How often onProgress fires, in ms. Defaults to 100 (10fps). The pose
   * overlay raises this to ~33 (30fps) so the skeleton animates smoothly
   * with playback.
   */
  progressUpdateIntervalMs?: number;
  onLoadedDurationMs: (durationMs: number) => void;
  onProgressMs: (currentMs: number) => void;
  onEnd: () => void;
  onError?: (message: string) => void;
}

export interface VideoPlayerHandle {
  /** Seek to an absolute position in seconds. */
  seek: (seconds: number) => void;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayerImpl(
    {
      uri,
      paused,
      rate,
      progressUpdateIntervalMs = 100,
      onLoadedDurationMs,
      onProgressMs,
      onEnd,
      onError,
    },
    ref,
  ) {
    const videoRef = useRef<VideoRef>(null);

    useImperativeHandle(
      ref,
      () => ({
        seek: (seconds: number) => {
          videoRef.current?.seek(seconds);
        },
      }),
      [],
    );

    return (
      <View style={styles.root}>
        <Video
          ref={videoRef}
          source={{ uri }}
          style={styles.video}
          paused={paused}
          rate={rate}
          resizeMode="contain"
          controls={false}
          repeat={false}
          progressUpdateInterval={progressUpdateIntervalMs}
          onLoad={data => onLoadedDurationMs(data.duration * 1000)}
          onProgress={data => onProgressMs(data.currentTime * 1000)}
          onEnd={onEnd}
          onError={err => onError?.(String(err?.error?.localizedDescription ?? err))}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
});
