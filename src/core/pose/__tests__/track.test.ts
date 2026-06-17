/**
 * pose/track — Unit tests
 * buildPoseTrack maps + sorts the raw native frames; poseAt does the
 * clamped binary-search lookup the overlay relies on.
 */

import { buildPoseTrack, poseAt } from '../track';
import type { PoseVideoFrame } from '../types';

const frame = (timeMs: number): PoseVideoFrame => ({
  timeMs,
  width: 100,
  height: 200,
  landmarks: [
    { name: 'left_upperArm_1_joint', x: 0.5, y: 0.5, z: 0, visibility: 0.9 },
  ],
});

describe('buildPoseTrack', () => {
  it('maps landmarks and sorts samples by time', () => {
    const track = buildPoseTrack([frame(200), frame(0), frame(100)]);
    expect(track.map(s => s.timeMs)).toEqual([0, 100, 200]);
    // aspect = width/height = 100/200
    expect(track[0]!.frame.aspect).toBeCloseTo(0.5);
    expect(track[0]!.frame.joints.leftShoulder).toBeDefined();
  });

  it('handles an empty input', () => {
    expect(buildPoseTrack([])).toEqual([]);
  });
});

describe('poseAt', () => {
  const track = buildPoseTrack([
    frame(0),
    frame(100),
    frame(200),
    frame(300),
  ]);

  it('returns null for an empty track', () => {
    expect(poseAt([], 50)).toBeNull();
  });

  it('clamps to the first sample before the start', () => {
    expect(poseAt(track, -10)).toBe(track[0]!.frame);
  });

  it('clamps to the last sample past the end', () => {
    expect(poseAt(track, 99999)).toBe(track[3]!.frame);
  });

  it('returns the latest sample at or before the time', () => {
    expect(poseAt(track, 100)).toBe(track[1]!.frame); // exact
    expect(poseAt(track, 150)).toBe(track[1]!.frame); // floor → 100
    expect(poseAt(track, 299)).toBe(track[2]!.frame); // floor → 200
    expect(poseAt(track, 300)).toBe(track[3]!.frame); // exact last
  });
});
