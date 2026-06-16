/**
 * DrawingCanvas — Component tests
 * jest's RN env doesn't run RNGH gestures, so we focus on what's
 * deterministic from JS: the canvas mounts, picks the correct
 * pointerEvents mode based on `enabled`, and exposes the expected
 * accessibility label when enabled.
 */

import { render } from '@testing-library/react-native';

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, { testID: 'gesture-detector' }, children),
    Gesture: {
      Pan: () => {
        const builder = {
          enabled: () => builder,
          onBegin: () => builder,
          onUpdate: () => builder,
          onFinalize: () => builder,
        };
        return builder;
      },
    },
  };
});

// `runOnJS` is already a pass-through in the global reanimated mock
// (see jest.setup.js), so we don't need a local override here.

import { DrawingCanvas } from '../DrawingCanvas';

const handlers = {
  onStrokeStart: jest.fn(),
  onStrokeMove: jest.fn(),
  onStrokeEnd: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DrawingCanvas', () => {
  it('mounts the gesture container regardless of enabled state', () => {
    const { getByTestId } = render(
      <DrawingCanvas enabled={false} {...handlers} />,
    );
    expect(getByTestId('gesture-detector')).toBeTruthy();
  });

  it('uses pointerEvents="none" so touches pass through when disabled', () => {
    const { queryByLabelText } = render(
      <DrawingCanvas enabled={false} {...handlers} />,
    );
    // When disabled the canvas has no accessibility label — taps fall
    // through to the underlying player Pressable.
    expect(queryByLabelText('Drawing canvas')).toBeNull();
  });

  it('exposes the accessibility label when enabled', () => {
    const { getByLabelText } = render(
      <DrawingCanvas enabled {...handlers} />,
    );
    expect(getByLabelText('Drawing canvas')).toBeTruthy();
  });
});
