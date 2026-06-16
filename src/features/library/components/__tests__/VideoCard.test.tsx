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
    storagePath: 'user-1/vid-1.mp4',
    thumbnailPath: 'user-1/vid-1.jpg',
    thumbnailUrl: 'https://public.example/thumb.jpg',
    hasAnalysis: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    tags: [],
    ...overrides,
  };
}

describe('VideoCard', () => {
  it('renders the user-editable title as the card label, plus duration', () => {
    const { getByText } = render(
      <VideoCard video={makeVideo()} onPress={jest.fn()} />,
    );
    // `title` drives the card label so user edits via the Edit sheet
    // surface here. The default upload sets title to the club name.
    expect(getByText('Range — 7 Iron')).toBeTruthy();
    expect(getByText('0:05')).toBeTruthy(); // 4500ms rounds to 5s
  });

  it('falls back to clubType when title is blank', () => {
    const { getByText } = render(
      <VideoCard
        video={makeVideo({ title: '', clubType: '8 Iron' })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('8 Iron')).toBeTruthy();
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

  it('falls back to "Swing" when both title and clubType are blank', () => {
    const { getByText } = render(
      <VideoCard
        video={makeVideo({ clubType: null, title: '' })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Swing')).toBeTruthy();
  });

  it('fires onPress with the video on tap', () => {
    const onPress = jest.fn();
    const video = makeVideo();
    const { getByRole } = render(<VideoCard video={video} onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(video);
  });

  it('fires onLongPress with the video when long-pressed', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const video = makeVideo();
    const { getByRole } = render(
      <VideoCard video={video} onPress={onPress} onLongPress={onLongPress} />,
    );
    fireEvent(getByRole('button'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith(video);
  });
});
