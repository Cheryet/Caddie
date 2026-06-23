/**
 * core/trim/client — Tests
 * The wrapper is a thin pass-through; verify it forwards args to the
 * native package unchanged and propagates the result / rejection.
 */

jest.mock('caddie-trim', () => ({
  trimVideo: jest.fn(async () => ({
    uri: 'file:///tmp/trimmed.mp4',
    durationMs: 4000,
  })),
}));

const { trimVideo: nativeTrimVideo } = require('caddie-trim') as {
  trimVideo: jest.Mock;
};
const { trimVideo } = require('../client');

beforeEach(() => jest.clearAllMocks());

describe('core/trim trimVideo', () => {
  it('delegates to the native module with the same args and returns its result', async () => {
    const result = await trimVideo('file:///in.mov', 1000, 5000);
    expect(nativeTrimVideo).toHaveBeenCalledWith('file:///in.mov', 1000, 5000);
    expect(result).toEqual({ uri: 'file:///tmp/trimmed.mp4', durationMs: 4000 });
  });

  it('propagates a native rejection', async () => {
    nativeTrimVideo.mockRejectedValueOnce(new Error('export_failed'));
    await expect(trimVideo('file:///in.mov', 0, 1000)).rejects.toThrow(
      'export_failed',
    );
  });
});
