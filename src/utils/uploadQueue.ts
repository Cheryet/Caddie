/**
 * uploadQueue — Utility
 * Persistent FIFO of swings that failed to upload. Backed by MMKV so
 * entries survive an app kill. Each job carries everything `uploadRecording`
 * needs to retry from scratch — we always start over rather than tracking
 * partial progress, because the compressed/thumbnail files live in temp
 * dirs that iOS can wipe between launches.
 *
 * The queue is small (a handful of failed uploads at most), so we store
 * the whole array under one MMKV key and rewrite it on every mutation.
 *
 * Spec: PROJECT_SPEC.md §13 line 587 — "On failure: store in MMKV upload
 * queue, retry on next network connection".
 */

import { z } from 'zod';

import { mmkv } from '@/core/mmkv/client';

const QUEUE_KEY = 'upload.queue.v1';

// ───── Job shape ─────────────────────────────────────────────────────────

const JobSchema = z.object({
  /** Stable id for the job itself — distinct from videoId because retries
   *  can change the videoId if the previous upload partially succeeded. */
  jobId: z.string(),
  /** Local filesystem URI of the original recording. */
  localUri: z.string(),
  angle: z.enum(['face-on', 'dtl']),
  swingHand: z.enum(['right', 'left']),
  clubType: z.string(),
  userId: z.string(),
  /** Number of times we've attempted this job — for capping retries. */
  attempts: z.number().int().nonnegative(),
  /** ISO timestamp when the job was first enqueued. */
  enqueuedAt: z.string(),
});

export type UploadJob = z.infer<typeof JobSchema>;

const QueueSchema = z.array(JobSchema);

export type NewUploadJob = Omit<UploadJob, 'jobId' | 'attempts' | 'enqueuedAt'>;

// ───── Storage helpers ───────────────────────────────────────────────────

function load(): UploadJob[] {
  const raw = mmkv.getString(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = QueueSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    // Stale shape — drop it. Better than crashing on every launch.
    mmkv.remove(QUEUE_KEY);
    return [];
  } catch {
    mmkv.remove(QUEUE_KEY);
    return [];
  }
}

function save(jobs: UploadJob[]): void {
  if (jobs.length === 0) {
    mmkv.remove(QUEUE_KEY);
    return;
  }
  mmkv.set(QUEUE_KEY, JSON.stringify(jobs));
}

// ───── Public API ────────────────────────────────────────────────────────

export function size(): number {
  return load().length;
}

export function peek(): UploadJob | null {
  return load()[0] ?? null;
}

/**
 * Enqueue a fresh job. Generates `jobId`, sets `attempts=0`, stamps
 * `enqueuedAt`. Returns the saved job so callers can log/display it.
 */
export function enqueue(input: NewUploadJob): UploadJob {
  const job: UploadJob = {
    ...input,
    jobId: makeJobId(),
    attempts: 0,
    enqueuedAt: new Date().toISOString(),
  };
  const jobs = load();
  jobs.push(job);
  save(jobs);
  return job;
}

/** Remove a job by id. Used after a successful retry. */
export function remove(jobId: string): void {
  const jobs = load().filter(j => j.jobId !== jobId);
  save(jobs);
}

/**
 * Replace a job's `attempts` counter. Used by `drain()` to record that
 * a retry happened even if it failed again.
 */
export function bumpAttempts(jobId: string): void {
  const jobs = load();
  const idx = jobs.findIndex(j => j.jobId === jobId);
  if (idx === -1) return;
  const current = jobs[idx];
  if (!current) return;
  jobs[idx] = { ...current, attempts: current.attempts + 1 };
  save(jobs);
}

/** Snapshot the queue without mutating it. */
export function list(): UploadJob[] {
  return load();
}

/** Clear everything. Test-only — production code doesn't need this. */
export function clear(): void {
  mmkv.remove(QUEUE_KEY);
}

// ───── Internals ─────────────────────────────────────────────────────────

function makeJobId(): string {
  // Hermes ships `crypto.randomUUID` since RN 0.74+. Falls back to a
  // timestamp-with-jitter id if it's somehow missing (jest stubs etc).
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } })
    .crypto;
  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID();
  }
  return `job_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
