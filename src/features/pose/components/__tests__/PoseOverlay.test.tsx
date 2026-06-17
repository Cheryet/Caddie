/**
 * PoseOverlay — Component tests
 * react-native-svg is mocked (jest.setup) so each primitive renders as
 * a View tagged `svg-<Name>` with its props spread on. We assert on the
 * count + styling of the bones (Line) and joints (Circle), the
 * skip-when-empty behaviour, and that key/face joints render per
 * DESIGN_SYSTEM §14.
 */

import { render } from '@testing-library/react-native';

import { PoseOverlay } from '../PoseOverlay';
import type { PoseFrame } from '@/core/pose';
import { colors } from '@/theme';

const CANVAS = { width: 100, height: 100 };

// leftShoulder + rightShoulder (key), leftElbow (plain), nose (face).
const frame: PoseFrame = {
  aspect: 1,
  joints: {
    leftShoulder: { joint: 'leftShoulder', x: 0.4, y: 0.3, confidence: 0.9 },
    rightShoulder: { joint: 'rightShoulder', x: 0.6, y: 0.3, confidence: 0.9 },
    leftElbow: { joint: 'leftElbow', x: 0.35, y: 0.5, confidence: 0.8 },
    nose: { joint: 'nose', x: 0.5, y: 0.1, confidence: 0.7 },
  },
};

describe('PoseOverlay', () => {
  it('returns null when there is no frame', () => {
    const { queryByTestId } = render(
      <PoseOverlay frame={null} canvasSize={CANVAS} />,
    );
    expect(queryByTestId('svg-Svg')).toBeNull();
  });

  it('returns null when the canvas has no size', () => {
    const { queryByTestId } = render(
      <PoseOverlay frame={frame} canvasSize={{ width: 0, height: 0 }} />,
    );
    expect(queryByTestId('svg-Svg')).toBeNull();
  });

  it('returns null when the frame has no joints', () => {
    const { queryByTestId } = render(
      <PoseOverlay frame={{ aspect: 1, joints: {} }} canvasSize={CANVAS} />,
    );
    expect(queryByTestId('svg-Svg')).toBeNull();
  });

  it('draws bones only between present joints', () => {
    const { queryAllByTestId } = render(
      <PoseOverlay frame={frame} canvasSize={CANVAS} />,
    );
    // shoulder↔shoulder and leftShoulder↔leftElbow are the only bones
    // whose endpoints are both present.
    expect(queryAllByTestId('svg-Line')).toHaveLength(2);
  });

  it('renders key joints larger + gold, plain joints smaller, and a head circle', () => {
    const { queryAllByTestId } = render(
      <PoseOverlay frame={frame} canvasSize={CANVAS} />,
    );
    const circles = queryAllByTestId('svg-Circle');

    const keyJoints = circles.filter(
      c => c.props.fill === colors.pose.jointKey,
    );
    const plainJoints = circles.filter(c => c.props.fill === colors.pose.joint);
    const head = circles.filter(c => c.props.fill === colors.pose.headFill);

    // 2 key (shoulders) + 1 plain (elbow) + 1 head (nose).
    expect(keyJoints).toHaveLength(2);
    expect(plainJoints).toHaveLength(1);
    expect(head).toHaveLength(1);

    expect(keyJoints[0]?.props.r).toBe(4);
    expect(plainJoints[0]?.props.r).toBe(3);
    expect(head[0]?.props.r).toBe(9);
    expect(head[0]?.props.stroke).toBe(colors.pose.headStroke);
  });

  it('does not draw the nose as a plain joint dot', () => {
    const { queryAllByTestId } = render(
      <PoseOverlay frame={frame} canvasSize={CANVAS} />,
    );
    // 4 circles total = 3 joints (no nose dot) + 1 head circle.
    expect(queryAllByTestId('svg-Circle')).toHaveLength(4);
  });
});
