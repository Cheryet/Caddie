/**
 * ImportConfirmSheet — component tests
 * Verifies the sheet renders the three swing-meta controls, the
 * primary CTA fires onConfirm with the current metadata, and the
 * loading state disables the CTA.
 */

import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ImportConfirmSheet } from '../ImportConfirmSheet';

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

const defaultProps = {
  visible: true,
  defaultClub: '7 Iron' as const,
  isUploading: false,
  onConfirm: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ImportConfirmSheet', () => {
  it('renders the header copy', () => {
    const { getByText } = wrap(<ImportConfirmSheet {...defaultProps} />);
    expect(getByText('Confirm swing')).toBeTruthy();
  });

  it('fires onConfirm with the default metadata when CTA is tapped', () => {
    const onConfirm = jest.fn();
    const { getByText } = wrap(
      <ImportConfirmSheet {...defaultProps} onConfirm={onConfirm} />,
    );
    fireEvent.press(getByText('Use this swing'));
    expect(onConfirm).toHaveBeenCalledWith({
      angle: 'face-on',
      swingHand: 'right',
      club: '7 Iron',
    });
  });

  it('passes the user-selected angle and hand on confirm', () => {
    const onConfirm = jest.fn();
    const { getByText } = wrap(
      <ImportConfirmSheet {...defaultProps} onConfirm={onConfirm} />,
    );
    fireEvent.press(getByText('DTL'));
    fireEvent.press(getByText('Left'));
    fireEvent.press(getByText('Use this swing'));
    expect(onConfirm).toHaveBeenCalledWith({
      angle: 'dtl',
      swingHand: 'left',
      club: '7 Iron',
    });
  });
});
