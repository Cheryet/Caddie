/**
 * uploadQueue — tests
 * Backed by the in-memory MMKV stub from jest.setup.js. Each test runs
 * with a clean queue so state doesn't bleed between cases.
 */

import {
  bumpAttempts,
  clear,
  enqueue,
  list,
  peek,
  remove,
  size,
} from '../uploadQueue';
import type { NewUploadJob } from '../uploadQueue';

import { mmkv } from '@/core/mmkv/client';

const sample: NewUploadJob = {
  localUri: '/tmp/swing.mov',
  angle: 'face-on',
  swingHand: 'right',
  clubType: '7 Iron',
  userId: 'user-1',
};

beforeEach(() => {
  clear();
});

describe('uploadQueue', () => {
  it('starts empty', () => {
    expect(size()).toBe(0);
    expect(peek()).toBeNull();
    expect(list()).toEqual([]);
  });

  it('enqueue stamps jobId, attempts=0, enqueuedAt', () => {
    const job = enqueue(sample);
    expect(job.jobId).toBeTruthy();
    expect(job.attempts).toBe(0);
    expect(Date.parse(job.enqueuedAt)).not.toBeNaN();
    expect(size()).toBe(1);
  });

  it('peek returns FIFO order', () => {
    const first = enqueue(sample);
    enqueue({ ...sample, localUri: '/tmp/2.mov' });
    expect(peek()?.jobId).toBe(first.jobId);
  });

  it('remove drops a job by id', () => {
    const job = enqueue(sample);
    enqueue({ ...sample, localUri: '/tmp/2.mov' });
    remove(job.jobId);
    expect(size()).toBe(1);
    expect(peek()?.localUri).toBe('/tmp/2.mov');
  });

  it('bumpAttempts increments the counter', () => {
    const job = enqueue(sample);
    bumpAttempts(job.jobId);
    bumpAttempts(job.jobId);
    expect(list()[0]?.attempts).toBe(2);
  });

  it('survives a malformed MMKV value by clearing the queue', () => {
    mmkv.set('upload.queue.v1', 'definitely not json');
    expect(list()).toEqual([]);
    // Subsequent enqueue works as if from empty.
    enqueue(sample);
    expect(size()).toBe(1);
  });

  it('drops stale-shape entries on read', () => {
    mmkv.set(
      'upload.queue.v1',
      JSON.stringify([{ unexpected: 'shape' }]),
    );
    expect(list()).toEqual([]);
  });
});
