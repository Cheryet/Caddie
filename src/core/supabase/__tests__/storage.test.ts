/**
 * storage — wrapper tests
 * Mocks `@/core/supabase/client` at the module boundary so the real
 * supabase-js never tries to make a network call. Verifies path
 * conventions, that errors map to our typed union, and that public-URL
 * resolution is wired correctly for thumbnails.
 */

// Explicit factory prevents the real module loading.
jest.mock('@/core/supabase/client', () => {
  const upload = jest.fn();
  const createSignedUrl = jest.fn();
  const remove = jest.fn();
  const getPublicUrl = jest.fn();
  const from = jest.fn(() => ({
    upload,
    createSignedUrl,
    remove,
    getPublicUrl,
  }));
  return {
    supabase: {
      storage: { from },
    },
    // Expose the inner mocks so tests can configure return values.
    __mocks: { upload, createSignedUrl, remove, getPublicUrl, from },
  };
});

const { __mocks } = require('@/core/supabase/client');
const {
  deleteThumbnail,
  deleteVideo,
  getSignedVideoUrl,
  uploadThumbnail,
  uploadVideo,
} = require('../storage');

const { upload, createSignedUrl, remove, getPublicUrl, from } = __mocks as {
  upload: jest.Mock;
  createSignedUrl: jest.Mock;
  remove: jest.Mock;
  getPublicUrl: jest.Mock;
  from: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  upload.mockResolvedValue({ data: null, error: null });
  createSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://signed.example/abc' },
    error: null,
  });
  remove.mockResolvedValue({ data: null, error: null });
  getPublicUrl.mockReturnValue({
    data: { publicUrl: 'https://public.example/thumb.jpg' },
  });
});

describe('uploadVideo', () => {
  it('uploads to videos bucket at {userId}/{videoId}.mp4', async () => {
    const result = await uploadVideo('user-1', 'vid-1', '/tmp/foo.mp4');
    expect(from).toHaveBeenCalledWith('videos');
    expect(upload).toHaveBeenCalledWith(
      'user-1/vid-1.mp4',
      expect.anything(),
      expect.objectContaining({ contentType: 'video/mp4', upsert: false }),
    );
    expect(result.data?.storagePath).toBe('user-1/vid-1.mp4');
    expect(result.error).toBeNull();
  });

  it('maps file_too_large from a 413 response', async () => {
    upload.mockResolvedValueOnce({
      data: null,
      error: { message: 'Payload too large', statusCode: '413' },
    });
    const result = await uploadVideo('u', 'v', '/x');
    expect(result.error?.code).toBe('file_too_large');
  });

  it('maps unauthorized from a 401 response', async () => {
    upload.mockResolvedValueOnce({
      data: null,
      error: { message: 'JWT expired', statusCode: '401' },
    });
    const result = await uploadVideo('u', 'v', '/x');
    expect(result.error?.code).toBe('unauthorized');
  });
});

describe('uploadThumbnail', () => {
  it('uploads to thumbnails bucket and resolves the public URL', async () => {
    const result = await uploadThumbnail('user-1', 'vid-1', '/tmp/t.jpg');
    expect(from).toHaveBeenCalledWith('thumbnails');
    expect(upload).toHaveBeenCalledWith(
      'user-1/vid-1.jpg',
      expect.anything(),
      expect.objectContaining({ contentType: 'image/jpeg', upsert: false }),
    );
    expect(result.data?.storagePath).toBe('user-1/vid-1.jpg');
    expect(result.data?.publicUrl).toBe('https://public.example/thumb.jpg');
  });
});

describe('getSignedVideoUrl', () => {
  it('returns the signed url', async () => {
    const result = await getSignedVideoUrl('user-1/vid-1.mp4');
    expect(createSignedUrl).toHaveBeenCalledWith('user-1/vid-1.mp4', 15 * 60);
    expect(result.data?.url).toBe('https://signed.example/abc');
  });

  it('maps not_found from a 404', async () => {
    createSignedUrl.mockResolvedValueOnce({
      data: null,
      error: { message: 'Object not found', statusCode: '404' },
    });
    const result = await getSignedVideoUrl('missing.mp4');
    expect(result.error?.code).toBe('not_found');
  });
});

describe('deleteVideo / deleteThumbnail', () => {
  it('calls remove on the correct bucket', async () => {
    await deleteVideo('user-1/vid-1.mp4');
    expect(from).toHaveBeenCalledWith('videos');
    expect(remove).toHaveBeenCalledWith(['user-1/vid-1.mp4']);

    await deleteThumbnail('user-1/vid-1.jpg');
    expect(from).toHaveBeenCalledWith('thumbnails');
    expect(remove).toHaveBeenCalledWith(['user-1/vid-1.jpg']);
  });
});
