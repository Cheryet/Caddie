/**
 * VideoCard — component tests
 * Verifies presentational contracts: duration formatting, AI badge
 * conditional rendering, and that tapping fires the parent handler with
 * the video.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { VideoCard } from '../VideoCard';
import type { Video } from '@/features/library/hooks/useVideos';

function makeVideo(overrides: Partial<Video> = {}): Video {
  return {
    id: 'vid-1',
    title: 'Range — 7 Iron',
    clubType: '7 Iron',
    cameraAngle: 'face-on',
    swingHand: 'right',
    durationMs: 4500,
    thumbnailUrl: 'https://public.example/thumb.jpg',
    hasAnalysis: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    ...overrides,
  };
}

describe('VideoCard', () => {
  it('renders club label and duration', () => {
    const { getByText } = render(
      <VideoCard video={makeVideo()} onPress={jest.fn()} />,
    );
    expect(getByText('7 Iron')).toBeTruthy();
    expect(getByText('0:05')).toBeTruthy(); // 4500ms rounds to 5s
  });

  it('omits the AI badge when not analysed', () => {
    const { queryByLabelText } = render(
      <VideoCard video={makeVideo({ hasAnalysis: false })} onPress={jest.fn()} />,
    );
    expect(queryByLabelText('Analysed swing')).toBeNull();
  });

  it('renders the AI badge when analysed', () => {
    const { getByLabelText } = render(
      <VideoCard video={makeVideo({ hasAnalysis: true })} onPress={jest.fn()} />,
    );
    expect(getByLabelText('Analysed swing')).toBeTruthy();
  });

  it('falls back to title when clubType is null', () => {
    const { getByText } = render(
      <VideoCard
        video={makeVideo({ clubType: null, title: 'Untitled swing' })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Untitled swing')).toBeTruthy();
  });

  it('fires onPress with the video on tap', () => {
    const onPress = jest.fn();
    const video = makeVideo();
    const { getByRole } = render(<VideoCard video={video} onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(video);
  });
});
