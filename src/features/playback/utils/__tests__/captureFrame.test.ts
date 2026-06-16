/**
 * captureFrame — Unit tests
 * Mocks react-native-view-shot. Verifies the happy path + error
 * mapping.
 */

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(),
}));

const { captureRef } = require('react-native-view-shot') as {
  captureRef: jest.Mock;
};
const { captureFrame } = require('../captureFrame');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('captureFrame', () => {
  it('returns a tmp file URI on success', async () => {
    captureRef.mockResolvedValueOnce('file:///tmp/abc.jpg');
    const result = await captureFrame({ current: null });
    expect(result.error).toBeNull();
    expect(result.data?.uri).toBe('file:///tmp/abc.jpg');
    expect(captureRef).toHaveBeenCalledWith(
      { current: null },
      expect.objectContaining({ format: 'jpg', result: 'tmpfile' }),
    );
  });

  it('maps a thrown error to the unknown code', async () => {
    captureRef.mockRejectedValueOnce(new Error('blocked'));
    const result = await captureFrame({ current: null });
    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('unknown');
    expect(result.error?.message).toBe('blocked');
  });
});
