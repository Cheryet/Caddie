/**
 * pose/landmarks — Unit tests
 * Verifies the raw→stable joint mapping (both Apple's rig names and the
 * defensive simple aliases), confidence filtering, aspect handling, and
 * that the bone/key/face sets only reference real joints.
 */

import {
  FACE_JOINTS,
  KEY_JOINTS,
  MIN_JOINT_CONFIDENCE,
  normalizeJointName,
  SKELETON_BONES,
  toPoseFrame,
  type PoseJoint,
} from '../landmarks';
import type { PoseLandmark } from '../types';

const lm = (
  name: string,
  x = 0.5,
  y = 0.5,
  visibility = 0.9,
): PoseLandmark => ({ name, x, y, z: 0, visibility });

describe('pose/landmarks · normalizeJointName', () => {
  it('maps the rig-style names (with and without the _1_ infix)', () => {
    expect(normalizeJointName('left_upperArm_1_joint')).toBe('leftShoulder');
    expect(normalizeJointName('left_forearm_1_joint')).toBe('leftElbow');
    expect(normalizeJointName('right_hand_1_joint')).toBe('rightWrist');
    expect(normalizeJointName('left_upLeg_joint')).toBe('leftHip'); // no _1_
    expect(normalizeJointName('right_leg_joint')).toBe('rightKnee'); // no _1_
    expect(normalizeJointName('left_foot_1_joint')).toBe('leftAnkle');
  });

  it('maps the plain anatomical names too', () => {
    expect(normalizeJointName('left_shoulder_1_joint')).toBe('leftShoulder');
    expect(normalizeJointName('right_elbow_joint')).toBe('rightElbow');
    expect(normalizeJointName('left_knee_1_joint')).toBe('leftKnee');
    expect(normalizeJointName('right_ankle_joint')).toBe('rightAnkle');
  });

  it('handles the suffix-less specials', () => {
    expect(normalizeJointName('root')).toBe('root');
    expect(normalizeJointName('neck_1_joint')).toBe('neck');
    expect(normalizeJointName('nose_1_joint')).toBe('nose');
  });

  it('returns null for unknown names', () => {
    expect(normalizeJointName('totally_made_up_joint')).toBeNull();
    expect(normalizeJointName('')).toBeNull();
  });
});

describe('pose/landmarks · toPoseFrame', () => {
  it('maps Apple Vision rig-style names to the stable schema', () => {
    const frame = toPoseFrame(
      [
        lm('left_upperArm_1_joint', 0.4, 0.3),
        lm('right_upLeg_1_joint', 0.6, 0.7),
        lm('nose_1_joint', 0.5, 0.1),
      ],
      1,
    );
    expect(frame.joints.leftShoulder).toEqual({
      joint: 'leftShoulder',
      x: 0.4,
      y: 0.3,
      confidence: 0.9,
    });
    expect(frame.joints.rightHip?.joint).toBe('rightHip');
    expect(frame.joints.nose?.joint).toBe('nose');
  });

  it('also maps the simpler semantic aliases', () => {
    const frame = toPoseFrame(
      [lm('left_shoulder_1_joint'), lm('right_wrist_1_joint')],
      1,
    );
    expect(frame.joints.leftShoulder).toBeDefined();
    expect(frame.joints.rightWrist).toBeDefined();
  });

  it('drops landmarks below the confidence floor', () => {
    const frame = toPoseFrame(
      [
        lm('left_hand_1_joint', 0.5, 0.5, MIN_JOINT_CONFIDENCE - 0.01),
        lm('right_hand_1_joint', 0.5, 0.5, MIN_JOINT_CONFIDENCE + 0.01),
      ],
      1,
    );
    expect(frame.joints.leftWrist).toBeUndefined();
    expect(frame.joints.rightWrist).toBeDefined();
  });

  it('ignores unknown joint names (and warns in dev)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const frame = toPoseFrame([lm('totally_made_up_joint'), lm('root')], 1);
    expect(Object.keys(frame.joints)).toEqual(['root']);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('totally_made_up_joint'),
    );
    warn.mockRestore();
  });

  it('passes through a positive aspect and normalises a bad one to 0', () => {
    expect(toPoseFrame([lm('root')], 1.78).aspect).toBeCloseTo(1.78);
    expect(toPoseFrame([lm('root')], 0).aspect).toBe(0);
    expect(toPoseFrame([lm('root')], -3).aspect).toBe(0);
    expect(toPoseFrame([lm('root')], NaN).aspect).toBe(0);
  });

  it('returns an empty joint map when nothing maps', () => {
    expect(toPoseFrame([], 1).joints).toEqual({});
  });
});

describe('pose/landmarks · skeleton metadata', () => {
  // The set of joints that toPoseFrame can ever produce.
  const validJoints = new Set<PoseJoint>([
    'nose',
    'leftEye',
    'rightEye',
    'leftEar',
    'rightEar',
    'neck',
    'leftShoulder',
    'rightShoulder',
    'leftElbow',
    'rightElbow',
    'leftWrist',
    'rightWrist',
    'root',
    'leftHip',
    'rightHip',
    'leftKnee',
    'rightKnee',
    'leftAnkle',
    'rightAnkle',
  ]);

  it('only connects bones between real joints', () => {
    for (const [a, b] of SKELETON_BONES) {
      expect(validJoints.has(a)).toBe(true);
      expect(validJoints.has(b)).toBe(true);
    }
  });

  it('highlights only golf-relevant joints (wrists, hips, shoulders)', () => {
    expect([...KEY_JOINTS].sort()).toEqual(
      [
        'leftShoulder',
        'rightShoulder',
        'leftWrist',
        'rightWrist',
        'leftHip',
        'rightHip',
      ].sort(),
    );
  });

  it('treats all head landmarks as face joints', () => {
    for (const joint of FACE_JOINTS) {
      expect(validJoints.has(joint)).toBe(true);
    }
    expect(FACE_JOINTS.has('nose')).toBe(true);
    expect(FACE_JOINTS.has('leftShoulder')).toBe(false);
  });
});
