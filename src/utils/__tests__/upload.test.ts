/**
 * upload — pipeline tests
 * Mocks the storage wrapper and supabase client at the module boundary
 * so the pipeline runs end-to-end without touching the network. Each
 * test verifies one of the failure-mode branches enqueues to the MMKV
 * queue (except when `fromQueue: true`).
 */

import { mmkv } from '@/core/mmkv/client';

// ───── Mocks ─────────────────────────────────────────────────────────────
// Jest hoists `jest.mock` to the top of the file, so factory bodies can
// only reference imports declared inline. We expose the inner spies via
// `__spies` on the mocked module and pull them out via require below.

jest.mock('@/core/supabase/client', () => {
  const insert = jest.fn().mockResolvedValue({ data: null, error: null });
  return {
    supabase: { from: () => ({ insert }) },
    __spies: { insert },
  };
});

jest.mock('@/core/supabase/storage', () => {
  const uploadVideo = jest.fn();
  const uploadThumbnail = jest.fn();
  return {
    uploadVideo,
    uploadThumbnail,
    __spies: { uploadVideo, uploadThumbnail },
  };
});

const { __spies: clientSpies } = require('@/core/supabase/client') as {
  __spies: { insert: jest.Mock };
};
const { __spies: storageSpies } = require('@/core/supabase/storage') as {
  __spies: { uploadVideo: jest.Mock; uploadThumbnail: jest.Mock };
};
const compressor = require('react-native-compressor');
const { uploadRecording } = require('../upload');
const {
  size: queueSize,
  list: queueList,
  clear: clearQueue,
} = require('../uploadQueue');

const { insert } = clientSpies;
const { uploadVideo, uploadThumbnail } = storageSpies;
const compress = compressor.Video.compress as jest.Mock;
const createVideoThumbnail = compressor.createVideoThumbnail as jest.Mock;

const input = {
  localUri: '/tmp/swing.mov',
  angle: 'face-on' as const,
  swingHand: 'right' as const,
  clubType: '7 Iron',
  userId: 'user-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  mmkv.clearAll();
  clearQueue();

  // Default happy-path returns.
  compress.mockResolvedValue('/tmp/compressed.mp4');
  createVideoThumbnail.mockResolvedValue({
    path: '/tmp/thumb.jpg',
    size: 1024,
    mime: 'image/jpeg',
    width: 100,
    height: 100,
  });
  uploadThumbnail.mockResolvedValue({
    data: {
      storagePath: 'user-1/test-uuid-0000-0000.jpg',
      publicUrl: 'https://example/thumb.jpg',
    },
    error: null,
  });
  uploadVideo.mockResolvedValue({
    data: { storagePath: 'user-1/test-uuid-0000-0000.mp4' },
    error: null,
  });
  insert.mockResolvedValue({ data: null, error: null });
});

describe('uploadRecording — happy path', () => {
  it('runs compress → thumb → upload thumb → upload video → insert', async () => {
    const result = await uploadRecording(input);
    expect(result.error).toBeNull();
    expect(result.data?.videoId).toBe('test-uuid-0000-0000');

    expect(compress).toHaveBeenCalledWith(
      input.localUri,
      expect.objectContaining({ compressionMethod: 'auto' }),
    );
    expect(createVideoThumbnail).toHaveBeenCalledWith('/tmp/compressed.mp4');
    expect(uploadThumbnail).toHaveBeenCalledWith(
      'user-1',
      'test-uuid-0000-0000',
      '/tmp/thumb.jpg',
    );
    expect(uploadVideo).toHaveBeenCalledWith(
      'user-1',
      'test-uuid-0000-0000',
      '/tmp/compressed.mp4',
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-uuid-0000-0000',
        user_id: 'user-1',
        storage_path: 'user-1/test-uuid-0000-0000.mp4',
        thumbnail_path: 'user-1/test-uuid-0000-0000.jpg',
        camera_angle: 'face-on',
        swing_hand: 'right',
        club_type: '7 Iron',
      }),
    );

    expect(queueSize()).toBe(0); // happy path doesn't enqueue
  });
});

describe('uploadRecording — failure paths enqueue', () => {
  it('compress failure enqueues and surfaces compress_failed', async () => {
    compress.mockRejectedValueOnce(new Error('codec missing'));
    const result = await uploadRecording(input);
    expect(result.error?.code).toBe('compress_failed');
    expect(queueSize()).toBe(1);
    expect(queueList()[0]?.localUri).toBe(input.localUri);
  });

  it('thumbnail failure enqueues and surfaces thumbnail_failed', async () => {
    createVideoThumbnail.mockRejectedValueOnce(new Error('no frame'));
    const result = await uploadRecording(input);
    expect(result.error?.code).toBe('thumbnail_failed');
    expect(queueSize()).toBe(1);
  });

  it('thumbnail upload failure enqueues and surfaces thumbnail_upload_failed', async () => {
    uploadThumbnail.mockResolvedValueOnce({
      data: null,
      error: { code: 'network', message: 'offline' },
    });
    const result = await uploadRecording(input);
    expect(result.error?.code).toBe('thumbnail_upload_failed');
    expect(result.error?.cause?.code).toBe('network');
    expect(queueSize()).toBe(1);
  });

  it('video upload failure enqueues and surfaces video_upload_failed', async () => {
    uploadVideo.mockResolvedValueOnce({
      data: null,
      error: { code: 'network', message: 'offline' },
    });
    const result = await uploadRecording(input);
    expect(result.error?.code).toBe('video_upload_failed');
    expect(queueSize()).toBe(1);
  });

  it('row insert failure enqueues and surfaces row_insert_failed', async () => {
    insert.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key' },
    });
    const result = await uploadRecording(input);
    expect(result.error?.code).toBe('row_insert_failed');
    expect(queueSize()).toBe(1);
  });
});

describe('uploadRecording — fromQueue does NOT re-enqueue', () => {
  it('returns the error without persisting a new job', async () => {
    compress.mockRejectedValueOnce(new Error('codec missing'));
    const result = await uploadRecording({ ...input, fromQueue: true });
    expect(result.error?.code).toBe('compress_failed');
    expect(queueSize()).toBe(0);
  });
});
