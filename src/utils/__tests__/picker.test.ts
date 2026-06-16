/**
 * picker — Unit tests
 * Mocks react-native-image-picker at the module boundary so the wrapper
 * can be driven through every branch of its `ImagePickerResponse`
 * mapping without going near native code.
 */

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

const { launchImageLibrary } = require('react-native-image-picker') as {
  launchImageLibrary: jest.Mock;
};
const { pickVideo } = require('../picker');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('pickVideo', () => {
  it('returns the picked video on the happy path', async () => {
    launchImageLibrary.mockResolvedValueOnce({
      assets: [
        {
          uri: 'file:///tmp/swing.mov',
          duration: 4.2,
          fileName: 'swing.mov',
        },
      ],
    });
    const result = await pickVideo();
    expect(result.error).toBeNull();
    expect(result.data).toEqual({
      uri: 'file:///tmp/swing.mov',
      durationSec: 4.2,
      fileName: 'swing.mov',
    });
  });

  it('maps user cancellation to error.code "cancelled"', async () => {
    launchImageLibrary.mockResolvedValueOnce({ didCancel: true });
    const result = await pickVideo();
    expect(result.error?.code).toBe('cancelled');
    expect(result.data).toBeNull();
  });

  it('maps permission denials to "permission_denied"', async () => {
    launchImageLibrary.mockResolvedValueOnce({
      errorCode: 'permission',
      errorMessage: 'denied',
    });
    const result = await pickVideo();
    expect(result.error?.code).toBe('permission_denied');
  });

  it('rejects videos longer than 60s as "too_long"', async () => {
    launchImageLibrary.mockResolvedValueOnce({
      assets: [{ uri: 'file:///tmp/long.mov', duration: 120 }],
    });
    const result = await pickVideo();
    expect(result.error?.code).toBe('too_long');
  });

  it('allows videos when duration is missing (defensive)', async () => {
    launchImageLibrary.mockResolvedValueOnce({
      assets: [{ uri: 'file:///tmp/swing.mov' }],
    });
    const result = await pickVideo();
    expect(result.error).toBeNull();
    expect(result.data?.durationSec).toBe(0);
  });

  it('falls back to "no_video" when no assets are returned', async () => {
    launchImageLibrary.mockResolvedValueOnce({ assets: [] });
    const result = await pickVideo();
    expect(result.error?.code).toBe('unknown');
  });

  it('returns "no_video" when the asset has no uri', async () => {
    launchImageLibrary.mockResolvedValueOnce({
      assets: [{ duration: 4 }],
    });
    const result = await pickVideo();
    expect(result.error?.code).toBe('no_video');
  });
});
