/**
 * pose/metrics — Unit tests
 * Pins the geometry of the four Phase 3.3 metrics: known shoulder/hip/
 * spine configurations → expected degrees, aspect correction, the
 * swingHand sign-flip (a non-negotiable), head-sway as % of shoulder
 * width, and per-metric null when joints are missing.
 */

import { computePoseMetrics } from '../metrics';
import type { PoseFrame, PoseJoint, PoseJointPoint } from '../landmarks';

const j = (
  joint: PoseJoint,
  x: number,
  y: number,
  confidence = 0.9,
): PoseJointPoint => ({ joint, x, y, confidence });

/** Build a frame directly from explicit joints (bypasses toPoseFrame so
 *  the test controls exactly which joints are present, incl. head). */
function frameOf(joints: PoseJointPoint[], aspect = 1): PoseFrame {
  const map: Partial<Record<PoseJoint, PoseJointPoint>> = {};
  for (const point of joints) map[point.joint] = point;
  return { joints: map, aspect };
}

describe('pose/metrics · shoulder rotation', () => {
  it('is ~0 for level shoulders', () => {
    const frame = frameOf([
      j('leftShoulder', 0.4, 0.5),
      j('rightShoulder', 0.6, 0.5),
    ]);
    const m = computePoseMetrics(frame, { swingHand: 'right' });
    expect(m.shoulderRotationDeg).toBeCloseTo(0, 5);
  });

  it('reads positive when the trail shoulder rises (RH backswing)', () => {
    // Right (trail) shoulder higher on screen (smaller y).
    const frame = frameOf([
      j('leftShoulder', 0.4, 0.55),
      j('rightShoulder', 0.6, 0.45),
    ]);
    // vec (0.2, -0.1) → atan2(-0.1, 0.2) = -26.57°, hand-flipped → +26.57°
    const m = computePoseMetrics(frame, { swingHand: 'right' });
    expect(m.shoulderRotationDeg).toBeCloseTo(26.57, 1);
  });

  it('flips sign for a left-handed golfer on the same geometry', () => {
    const frame = frameOf([
      j('leftShoulder', 0.4, 0.55),
      j('rightShoulder', 0.6, 0.45),
    ]);
    const right = computePoseMetrics(frame, { swingHand: 'right' });
    const left = computePoseMetrics(frame, { swingHand: 'left' });
    expect(left.shoulderRotationDeg).toBeCloseTo(
      -(right.shoulderRotationDeg as number),
      5,
    );
  });

  it('aspect-corrects the angle on non-square video', () => {
    const joints = [
      j('leftShoulder', 0.4, 0.5),
      j('rightShoulder', 0.6, 0.4),
    ];
    const square = computePoseMetrics(frameOf(joints, 1), {
      swingHand: 'right',
    });
    const wide = computePoseMetrics(frameOf(joints, 2), {
      swingHand: 'right',
    });
    // aspect 1: atan2(-0.1, 0.2)=-26.57 → +26.57; aspect 2: atan2(-0.1,0.4)=-14.04 → +14.04
    expect(square.shoulderRotationDeg).toBeCloseTo(26.57, 1);
    expect(wide.shoulderRotationDeg).toBeCloseTo(14.04, 1);
  });

  it('is null when a shoulder is missing', () => {
    const frame = frameOf([j('leftShoulder', 0.4, 0.5)]);
    expect(computePoseMetrics(frame, { swingHand: 'right' }).shoulderRotationDeg).toBeNull();
  });
});

describe('pose/metrics · hip–shoulder separation', () => {
  it('equals the shoulder tilt when the hips are level', () => {
    const frame = frameOf([
      j('leftShoulder', 0.4, 0.55),
      j('rightShoulder', 0.6, 0.45),
      j('leftHip', 0.42, 0.75),
      j('rightHip', 0.58, 0.75),
    ]);
    // shoulderTilt raw -26.57, hipTilt 0 → handSign*(−26.57−0)=+26.57
    const m = computePoseMetrics(frame, { swingHand: 'right' });
    expect(m.hipShoulderSeparationDeg).toBeCloseTo(26.57, 1);
  });

  it('is ~0 when hips and shoulders share the same tilt', () => {
    const frame = frameOf([
      j('leftShoulder', 0.4, 0.55),
      j('rightShoulder', 0.6, 0.45),
      j('leftHip', 0.4, 0.75),
      j('rightHip', 0.6, 0.65),
    ]);
    const m = computePoseMetrics(frame, { swingHand: 'right' });
    expect(m.hipShoulderSeparationDeg).toBeCloseTo(0, 5);
  });

  it('flips sign with swingHand', () => {
    const frame = frameOf([
      j('leftShoulder', 0.4, 0.55),
      j('rightShoulder', 0.6, 0.45),
      j('leftHip', 0.42, 0.75),
      j('rightHip', 0.58, 0.75),
    ]);
    const right = computePoseMetrics(frame, { swingHand: 'right' });
    const left = computePoseMetrics(frame, { swingHand: 'left' });
    expect(left.hipShoulderSeparationDeg).toBeCloseTo(
      -(right.hipShoulderSeparationDeg as number),
      5,
    );
  });

  it('is null when a hip is missing', () => {
    const frame = frameOf([
      j('leftShoulder', 0.4, 0.55),
      j('rightShoulder', 0.6, 0.45),
      j('leftHip', 0.42, 0.75),
    ]);
    expect(
      computePoseMetrics(frame, { swingHand: 'right' }).hipShoulderSeparationDeg,
    ).toBeNull();
  });
});

describe('pose/metrics · spine tilt', () => {
  it('is ~0 for a vertical spine', () => {
    const frame = frameOf([
      j('root', 0.5, 0.7),
      j('neck', 0.5, 0.45),
    ]);
    expect(
      computePoseMetrics(frame, { swingHand: 'right' }).spineTiltDeg,
    ).toBeCloseTo(0, 5);
  });

  it('reads the lean angle and flips with swingHand', () => {
    const frame = frameOf([
      j('root', 0.5, 0.7),
      j('neck', 0.6, 0.45),
    ]);
    // vec (0.1, -0.25) → atan2(0.1, 0.25)=21.80°, RH hand-flip → -21.80
    const right = computePoseMetrics(frame, { swingHand: 'right' });
    const left = computePoseMetrics(frame, { swingHand: 'left' });
    expect(right.spineTiltDeg).toBeCloseTo(-21.8, 1);
    expect(left.spineTiltDeg).toBeCloseTo(21.8, 1);
  });

  it('is null when root or neck is missing', () => {
    const frame = frameOf([j('neck', 0.5, 0.45)]);
    expect(
      computePoseMetrics(frame, { swingHand: 'right' }).spineTiltDeg,
    ).toBeNull();
  });
});

describe('pose/metrics · head delta', () => {
  const shoulders = [
    j('leftShoulder', 0.4, 0.5),
    j('rightShoulder', 0.6, 0.5),
  ]; // width 0.2 (aspect 1)

  it('is 0 when the head has not moved from address', () => {
    const frame = frameOf([...shoulders, j('head', 0.5, 0.1)]);
    const m = computePoseMetrics(frame, {
      swingHand: 'right',
      baselineHead: { x: 0.5, y: 0.1 },
    });
    expect(m.headDeltaPct).toBeCloseTo(0, 5);
  });

  it('reports the sway as a percentage of shoulder width', () => {
    const frame = frameOf([...shoulders, j('head', 0.6, 0.1)]);
    // moved 0.1 / shoulder width 0.2 = 50%
    const m = computePoseMetrics(frame, {
      swingHand: 'right',
      baselineHead: { x: 0.5, y: 0.1 },
    });
    expect(m.headDeltaPct).toBeCloseTo(50, 5);
  });

  it('is null without a baseline, even when head + shoulders are present', () => {
    const frame = frameOf([...shoulders, j('head', 0.6, 0.1)]);
    expect(
      computePoseMetrics(frame, { swingHand: 'right' }).headDeltaPct,
    ).toBeNull();
  });

  it('is null when the head is missing', () => {
    const frame = frameOf(shoulders);
    const m = computePoseMetrics(frame, {
      swingHand: 'right',
      baselineHead: { x: 0.5, y: 0.1 },
    });
    expect(m.headDeltaPct).toBeNull();
  });
});

describe('pose/metrics · empty frame', () => {
  it('returns all-null for a frame with no joints', () => {
    const m = computePoseMetrics({ joints: {}, aspect: 1 }, {
      swingHand: 'right',
    });
    expect(m).toEqual({
      shoulderRotationDeg: null,
      hipShoulderSeparationDeg: null,
      spineTiltDeg: null,
      headDeltaPct: null,
    });
  });
});
