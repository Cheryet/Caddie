/**
 * AnalysisLoading — Component tests
 * Verifies the headline, staged-progress labels, the close affordance, and
 * that the elapsed counter ticks (fake timers).
 */

import type { ReactElement } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalysisLoading } from '../AnalysisLoading';

// AnalysisLoading reads safe-area insets — wrap with metrics so the provider
// renders children (a bare provider renders nothing until measured).
const renderS = (ui: ReactElement) =>
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 393, height: 852 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}>
      {ui}
    </SafeAreaProvider>,
  );

describe('AnalysisLoading', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders the headline and staged progress', () => {
    const { getByText } = renderS(<AnalysisLoading />);
    expect(getByText('Analysing your swing')).toBeTruthy();
    expect(getByText('Frames extracted')).toBeTruthy();
    expect(getByText('Pose detected')).toBeTruthy();
    expect(getByText('Generating coaching notes')).toBeTruthy();
  });

  it('starts the elapsed counter at 0:00 and ticks each second', () => {
    const { getByText } = renderS(<AnalysisLoading />);
    expect(getByText('0:00 elapsed')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(getByText('0:03 elapsed')).toBeTruthy();
  });

  it('renders and fires the close button when onClose is provided', () => {
    const onClose = jest.fn();
    const { getByLabelText } = renderS(<AnalysisLoading onClose={onClose} />);
    fireEvent.press(getByLabelText('Cancel analysis'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('omits the close button when onClose is absent', () => {
    const { queryByLabelText } = renderS(<AnalysisLoading />);
    expect(queryByLabelText('Cancel analysis')).toBeNull();
  });
});
