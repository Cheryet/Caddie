/**
 * VideoPlayer — Smoke test
 * The component is thin — it forwards events from react-native-video
 * to the props passed in. We mock react-native-video to expose its
 * onLoad/onProgress/onEnd handlers so we can assert they normalize to
 * milliseconds.
 */

import { createRef } from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  const captured = { handlers: {}, seek: jest.fn() };
  const MockVideo = React.forwardRef(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any, ref: any) => {
      captured.handlers = props;
      React.useImperativeHandle(ref, () => ({ seek: captured.seek }));
      return React.createElement(View, { testID: 'rnvideo-stub' });
    },
  );
  return { __esModule: true, default: MockVideo, __captured: captured };
});

const { __captured } = require('react-native-video') as {
  __captured: {
    handlers: {
      onLoad?: (data: { duration: number }) => void;
      onProgress?: (data: { currentTime: number }) => void;
      onEnd?: () => void;
    };
    seek: jest.Mock;
  };
};
const { VideoPlayer } = require('../VideoPlayer');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('VideoPlayer', () => {
  it('normalizes onLoad / onProgress / onEnd to ms callbacks', () => {
    const onLoadedDurationMs = jest.fn();
    const onProgressMs = jest.fn();
    const onEnd = jest.fn();

    render(
      <VideoPlayer
        uri="file:///tmp/swing.mov"
        paused={false}
        rate={1}
        onLoadedDurationMs={onLoadedDurationMs}
        onProgressMs={onProgressMs}
        onEnd={onEnd}
      />,
    );

    __captured.handlers.onLoad?.({ duration: 4.5 });
    expect(onLoadedDurationMs).toHaveBeenCalledWith(4500);

    __captured.handlers.onProgress?.({ currentTime: 1.234 });
    expect(onProgressMs).toHaveBeenCalledWith(1234);

    __captured.handlers.onEnd?.();
    expect(onEnd).toHaveBeenCalled();
  });

  it('forwards seek through the imperative handle', () => {
    const ref = createRef<{ seek: (s: number) => void }>();
    render(
      <VideoPlayer
        ref={ref}
        uri="file:///tmp/swing.mov"
        paused
        rate={1}
        onLoadedDurationMs={jest.fn()}
        onProgressMs={jest.fn()}
        onEnd={jest.fn()}
      />,
    );
    ref.current?.seek(2.5);
    expect(__captured.seek).toHaveBeenCalledWith(2.5);
  });
});
