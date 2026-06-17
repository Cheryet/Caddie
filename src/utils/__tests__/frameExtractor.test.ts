/**
 * frameExtractor — Unit tests
 * Covers the two pure pieces (canonical-position detection over a pose track,
 * and the evenly-spaced fallback schedule) plus the orchestration branching
 * (pose path vs fallback vs render). The native render + real pose track are
 * exercised on-device / in the Simulator (the fallback path) — see TODO.md.
 *
 * `@/core/pose` is partially mocked: the real `computePoseMetrics` /
 * `buildPoseTrack` drive the detector, while the IO boundary (`isPoseReady`,
 * `precomputePoses`, `extractFrameJpegs`, `buildPoseTrack`) is stubbed so the
 * orchestration can be steered without a native module.
 */

jest.mock('@/core/pose', () => {
  const actual = jest.requireActual('@/core/pose');
  return {
    ...actual,
    isPoseReady: jest.fn(),
    precomputePoses: jest.fn(),
    extractFrameJpegs: jest.fn(),
    buildPoseTrack: jest.fn(),
  };
});

import { ANALYSIS_FRAME_JPEG_QUALITY, ANALYSIS_FRAME_MAX_PX } from '@/constants/config';
import {
  buildPoseTrack,
  extractFrameJpegs,
  isPoseReady,
  precomputePoses,
  type PoseTrack,
} from '@/core/pose';
import type { PoseFrame, PoseJoint, PoseJointPoint } from '@/core/pose';
import {
  detectSwingPositions,
  extractAnalysisFrames,
  fallbackTimestamps,
} from '@/utils/frameExtractor';

const mockIsPoseReady = isPoseReady as jest.Mock;
const mockPrecompute = precomputePoses as jest.Mock;
const mockExtract = extractFrameJpegs as jest.Mock;
const mockBuildTrack = buildPoseTrack as jest.Mock;

const jp = (joint: PoseJoint, x: number, y: number): PoseJointPoint => ({
  joint,
  x,
  y,
  confidence: 0.9,
});

/**
 * A frame with a controllable backswing turn and hand height. `turn` 0→1
 * widens the shoulder tilt (for a right-handed golfer the trail/right
 * shoulder rises → positive `shoulderRotationDeg`); `hands` is the wrist y
 * (larger = lower on screen). `hand: 'left'` mirrors the shoulder config.
 */
function frameOf(turn: number, hands: number, hand: 'right' | 'left' = 'right'): PoseFrame {
  const a = turn * 0.2;
  const lsY = hand === 'right' ? 0.5 + a : 0.5 - a;
  const rsY = hand === 'right' ? 0.5 - a : 0.5 + a;
  return {
    aspect: 1,
    joints: {
      leftShoulder: jp('leftShoulder', 0.4, lsY),
      rightShoulder: jp('rightShoulder', 0.6, rsY),
      leftWrist: jp('leftWrist', 0.5, hands),
      rightWrist: jp('rightWrist', 0.5, hands),
    },
  };
}

/**
 * A 24-sample swing: backswing turn rising to a clear peak at index 10
 * (hands highest), downswing to hands-lowest at index 16, then through to a
 * finish at index 23. Timestamps are 40ms apart (distinct, increasing).
 */
function makeSwingTrack(hand: 'right' | 'left' = 'right'): PoseTrack {
  const turns = [
    // backswing 0→10 (peak turn at 10)
    0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.8, 0.88, 0.94, 0.98, 1, // 0..10
    // downswing 11→16 (turn unwinds; impact ~16)
    0.85, 0.6, 0.4, 0.2, 0.08, 0, // 11..16
    // through 17→23
    0.04, 0.06, 0.05, 0.04, 0.03, 0.02, 0.01, // 17..23
  ];
  const hands = [
    // hands lift through the backswing (y shrinks = higher)
    0.6, 0.56, 0.5, 0.44, 0.4, 0.36, 0.33, 0.31, 0.3, 0.3, 0.29, // 0..10 (highest)
    // hands drop to impact (y grows = lower), lowest at 16
    0.36, 0.46, 0.58, 0.68, 0.74, 0.78, // 11..16 (lowest)
    // hands rise into the finish
    0.7, 0.6, 0.5, 0.42, 0.38, 0.36, 0.35, // 17..23
  ];
  return turns.map((turn, i) => ({
    timeMs: i * 40,
    frame: frameOf(turn, hands[i]!, hand),
  }));
}

describe('fallbackTimestamps', () => {
  it('places 8 frames at the spec fractions of duration', () => {
    expect(fallbackTimestamps(1000)).toEqual([100, 200, 300, 450, 550, 650, 750, 900]);
  });

  it('is strictly increasing even for a degenerate zero duration', () => {
    const t = fallbackTimestamps(0);
    expect(t).toHaveLength(8);
    for (let i = 1; i < t.length; i++) {
      expect(t[i]!).toBeGreaterThan(t[i - 1]!);
    }
  });

  it('stays strictly increasing for a very short clip', () => {
    const t = fallbackTimestamps(20);
    for (let i = 1; i < t.length; i++) {
      expect(t[i]!).toBeGreaterThan(t[i - 1]!);
    }
  });
});

describe('detectSwingPositions', () => {
  it('anchors top at peak turn and impact at hands-lowest (right-handed)', () => {
    const track = makeSwingTrack('right');
    const ts = detectSwingPositions(track, 'right');
    expect(ts).not.toBeNull();
    expect(ts).toHaveLength(8);
    // Address at the start, finish at the last sample.
    expect(ts![0]).toBe(track[0]!.timeMs);
    expect(ts![7]).toBe(track[23]!.timeMs);
    // Top (index 3) = peak-turn sample (10); impact (index 6) = hands-lowest (16).
    expect(ts![3]).toBe(track[10]!.timeMs);
    expect(ts![6]).toBe(track[16]!.timeMs);
  });

  it('returns strictly increasing timestamps in swing order', () => {
    const ts = detectSwingPositions(makeSwingTrack('right'), 'right')!;
    for (let i = 1; i < ts.length; i++) {
      expect(ts[i]!).toBeGreaterThan(ts[i - 1]!);
    }
  });

  it('respects swingHand — a left-handed swing anchors correctly', () => {
    const track = makeSwingTrack('left');
    const ts = detectSwingPositions(track, 'left');
    expect(ts).not.toBeNull();
    expect(ts![3]).toBe(track[10]!.timeMs); // top still at peak turn
    expect(ts![6]).toBe(track[16]!.timeMs); // impact still at hands-lowest
  });

  it('returns null when the wrong hand is assumed (sign inverts the peak)', () => {
    // A right-handed-shaped swing read as left-handed flips the rotation sign,
    // so the "peak turn" lands at a boundary and detection bails to fallback.
    const ts = detectSwingPositions(makeSwingTrack('right'), 'left');
    expect(ts).toBeNull();
  });

  it('returns null for a track that is too short to classify', () => {
    const track = makeSwingTrack('right').slice(0, 4);
    expect(detectSwingPositions(track, 'right')).toBeNull();
  });

  it('returns null for a no-swing clip (peak at a boundary)', () => {
    const flat: PoseTrack = Array.from({ length: 12 }, (_, i) => ({
      timeMs: i * 40,
      frame: frameOf(0, 0.6, 'right'),
    }));
    expect(detectSwingPositions(flat, 'right')).toBeNull();
  });
});

describe('extractAnalysisFrames', () => {
  const FRAMES = Array.from({ length: 8 }, (_, i) => `jpeg${i}`);

  beforeEach(() => {
    jest.clearAllMocks();
    mockExtract.mockResolvedValue(FRAMES);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore?.();
  });

  it('uses the pose path when the engine is ready and the track classifies', async () => {
    const track = makeSwingTrack('right');
    mockIsPoseReady.mockReturnValue(true);
    mockPrecompute.mockResolvedValue([]);
    mockBuildTrack.mockReturnValue(track);

    const result = await extractAnalysisFrames('file://swing.mp4', {
      swingHand: 'right',
      durationMs: 2000,
    });

    expect(result.strategy).toBe('pose');
    expect(result.frames).toEqual(FRAMES);
    expect(result.timestampsMs).toEqual(detectSwingPositions(track, 'right'));
    expect(mockExtract).toHaveBeenCalledWith(
      'file://swing.mp4',
      result.timestampsMs,
      ANALYSIS_FRAME_MAX_PX,
      ANALYSIS_FRAME_JPEG_QUALITY,
    );
  });

  it('falls back to evenly-spaced frames when pose is not ready', async () => {
    mockIsPoseReady.mockReturnValue(false);

    const result = await extractAnalysisFrames('file://swing.mp4', {
      swingHand: 'right',
      durationMs: 2000,
    });

    expect(mockPrecompute).not.toHaveBeenCalled();
    expect(result.strategy).toBe('fallback');
    expect(result.timestampsMs).toEqual(fallbackTimestamps(2000));
    expect(result.frames).toEqual(FRAMES);
  });

  it('falls back when the track cannot be classified', async () => {
    mockIsPoseReady.mockReturnValue(true);
    mockPrecompute.mockResolvedValue([]);
    mockBuildTrack.mockReturnValue(makeSwingTrack('right').slice(0, 4));

    const result = await extractAnalysisFrames('file://swing.mp4', {
      swingHand: 'right',
      durationMs: 3000,
    });

    expect(result.strategy).toBe('fallback');
    expect(result.timestampsMs).toEqual(fallbackTimestamps(3000));
  });

  it('falls back (does not throw) when the pose pre-compute fails', async () => {
    mockIsPoseReady.mockReturnValue(true);
    mockPrecompute.mockRejectedValue(new Error('engine blew up'));

    const result = await extractAnalysisFrames('file://swing.mp4', {
      swingHand: 'left',
      durationMs: 1500,
    });

    expect(result.strategy).toBe('fallback');
    expect(result.timestampsMs).toEqual(fallbackTimestamps(1500));
    expect(result.frames).toEqual(FRAMES);
  });
});
