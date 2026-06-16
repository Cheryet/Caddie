/**
 * DeleteConfirmSheet — Component tests
 * Asserts title/subject copy renders, Delete fires onConfirm, Cancel
 * fires onDismiss, and the Delete button disables while isDeleting.
 */

import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DeleteConfirmSheet } from '../DeleteConfirmSheet';
import type { Video } from '@/features/library/hooks/useVideos';

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

function makeVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'vid-1',
    title: 'Range — 7 Iron',
    clubType: '7 Iron',
    cameraAngle: 'face-on',
    swingHand: 'right',
    durationMs: 4200,
    storagePath: 'user-1/vid-1.mp4',
    thumbnailPath: 'user-1/vid-1.jpg',
    thumbnailUrl: 'https://public.example/thumb.jpg',
    hasAnalysis: false,
    createdAt: '2026-06-15T11:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

const baseProps = {
  video: null as Video | null,
  isDeleting: false,
  onConfirm: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DeleteConfirmSheet', () => {
  it('renders the title and subject', () => {
    const { getByText } = wrap(
      <DeleteConfirmSheet {...baseProps} video={makeVideo()} />,
    );
    expect(getByText('Delete swing?')).toBeTruthy();
    expect(getByText(/7 Iron/)).toBeTruthy();
  });

  it('fires onConfirm when Delete is tapped', () => {
    const onConfirm = jest.fn();
    const { getByText } = wrap(
      <DeleteConfirmSheet
        {...baseProps}
        video={makeVideo()}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.press(getByText('Delete'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('fires onDismiss when Cancel is tapped', () => {
    const onDismiss = jest.fn();
    const { getByText } = wrap(
      <DeleteConfirmSheet
        {...baseProps}
        video={makeVideo()}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.press(getByText('Cancel'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('shows the loading state on the Delete button while isDeleting', () => {
    const { getAllByRole } = wrap(
      <DeleteConfirmSheet
        {...baseProps}
        video={makeVideo()}
        isDeleting
      />,
    );
    // BottomSheet's backdrop is also accessibilityRole="button" — find
    // the Delete button by its busy state instead of by position.
    const busyButtons = getAllByRole('button').filter(
      n => n.props.accessibilityState?.busy === true,
    );
    expect(busyButtons.length).toBe(1);
    expect(busyButtons[0]!.props.accessibilityState.disabled).toBe(true);
  });
});
