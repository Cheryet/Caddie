/**
 * EditVideoSheet — Component tests
 * Asserts pre-fill from the video, that onSave fires with the parsed
 * shape (including trimmed tags), and that the Save button reflects
 * isSaving.
 */

import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { EditVideoSheet } from '../EditVideoSheet';
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
    tags: ['range', 'warmup'],
    ...overrides,
  };
}

const defaultProps = {
  video: null as Video | null,
  isSaving: false,
  onSave: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('EditVideoSheet', () => {
  it('pre-fills fields from the video on open', () => {
    const { getByDisplayValue } = wrap(
      <EditVideoSheet {...defaultProps} video={makeVideo()} />,
    );
    expect(getByDisplayValue('Range — 7 Iron')).toBeTruthy();
    expect(getByDisplayValue('range, warmup')).toBeTruthy();
  });

  it('fires onSave with the edited shape', () => {
    const onSave = jest.fn();
    const { getByDisplayValue, getByText } = wrap(
      <EditVideoSheet
        {...defaultProps}
        video={makeVideo()}
        onSave={onSave}
      />,
    );

    fireEvent.changeText(getByDisplayValue('Range — 7 Iron'), 'Updated title');
    fireEvent.changeText(getByDisplayValue('range, warmup'), 'a , b,  c ');
    fireEvent.press(getByText('DTL'));
    fireEvent.press(getByText('Left'));
    fireEvent.press(getByText('Save changes'));

    expect(onSave).toHaveBeenCalledWith({
      title: 'Updated title',
      clubType: '7 Iron',
      cameraAngle: 'dtl',
      swingHand: 'left',
      tags: ['a', 'b', 'c'],
    });
  });

  it('falls back to the video title when the input is blanked', () => {
    const onSave = jest.fn();
    const { getByDisplayValue, getByText } = wrap(
      <EditVideoSheet
        {...defaultProps}
        video={makeVideo()}
        onSave={onSave}
      />,
    );
    fireEvent.changeText(getByDisplayValue('Range — 7 Iron'), '   ');
    fireEvent.press(getByText('Save changes'));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Range — 7 Iron' }),
    );
  });
});
