/**
 * TrimBar — Component tests
 * Renders the bar and verifies the duration label plus the Apply/Cancel
 * callbacks. gesture-handler is stubbed (jest can't load its native side)
 * so the handles render as plain views.
 */

import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  const makeGesture = () => {
    const g: Record<string, () => unknown> = {};
    g.runOnJS = () => g;
    g.onBegin = () => g;
    g.onUpdate = () => g;
    return g;
  };
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    Gesture: { Pan: () => makeGesture() },
  };
});

const { TrimBar } = require('../TrimBar');

function wrap(ui: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {ui}
    </SafeAreaProvider>,
  );
}

describe('TrimBar', () => {
  it('renders the title + full-clip duration and fires Apply/Cancel', () => {
    const onApply = jest.fn();
    const onCancel = jest.fn();
    const { getByText } = wrap(
      <TrimBar
        durationMs={10000}
        thumbnails={[]}
        thumbsStatus="idle"
        initialRange={null}
        minDurationMs={800}
        onSeekMs={jest.fn()}
        onCancel={onCancel}
        onApply={onApply}
      />,
    );

    expect(getByText('Trim swing')).toBeTruthy();
    // initialRange null → full clip selected → 10.0s span.
    expect(getByText('10.0s')).toBeTruthy();

    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith(0, 10000);
  });
});
