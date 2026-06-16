/**
 * pose/client — Unit tests
 * Verifies the status pub/sub, idempotent init, the loader's
 * failure-mode mapping, and the detectPose proxy. The default
 * loader pulls from `caddie-pose` whose native bridge is mocked in
 * jest.setup.js — under jest the require resolves but the
 * `initialize()` call rejects with "not found", which our regex
 * maps to `package_unavailable`.
 */

import {
  __resetPoseClientForTests,
  detectPose,
  getPoseError,
  getPoseStatus,
  initPose,
  isPoseReady,
  subscribePoseStatus,
  type PoseModule,
} from '../client';

const fakeModule = (): PoseModule => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  detectOnImage: jest
    .fn()
    .mockResolvedValue([
      { name: 'left_shoulder_1_joint', x: 0.4, y: 0.3, z: 0, visibility: 0.9 },
    ]),
});

beforeEach(() => {
  __resetPoseClientForTests();
  jest.clearAllMocks();
});

describe('pose/client', () => {
  it('starts in idle state', () => {
    expect(getPoseStatus()).toBe('idle');
    expect(isPoseReady()).toBe(false);
    expect(getPoseError()).toBeNull();
  });

  it('initPose with default loader reports failed (caddie-pose native module unregistered under jest)', async () => {
    await initPose();
    expect(getPoseStatus()).toBe('failed');
    expect(isPoseReady()).toBe(false);
    expect(getPoseError()?.code).toBe('package_unavailable');
  });

  it('initPose reports ready when a working loader is injected', async () => {
    await initPose(fakeModule);
    expect(getPoseStatus()).toBe('ready');
    expect(isPoseReady()).toBe(true);
    expect(getPoseError()).toBeNull();
  });

  it('initPose surfaces "not registered" loader errors as package_unavailable', async () => {
    await initPose(() => {
      throw new Error('CaddiePose native module not found');
    });
    expect(getPoseStatus()).toBe('failed');
    expect(getPoseError()?.code).toBe('package_unavailable');
  });

  it('initPose maps non-package failures to "unknown" code', async () => {
    await initPose(() => {
      throw new Error('something else broke');
    });
    expect(getPoseError()?.code).toBe('unknown');
  });

  it('initPose is idempotent — second call while ready is a no-op', async () => {
    const mod = fakeModule();
    await initPose(() => mod);
    expect(getPoseStatus()).toBe('ready');
    await initPose(() => mod);
    expect(getPoseStatus()).toBe('ready');
    // initialize() only called once across both initPose invocations.
    expect(mod.initialize).toHaveBeenCalledTimes(1);
  });

  it('subscribePoseStatus fires the listener on each transition', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribePoseStatus(listener);
    await initPose(fakeModule);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0]![0]).toBe('loading');
    expect(listener.mock.calls[1]![0]).toBe('ready');

    unsubscribe();
    __resetPoseClientForTests();
    await initPose(fakeModule);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('detectPose proxies through to the active engine', async () => {
    const mod = fakeModule();
    await initPose(() => mod);
    const result = await detectPose('file:///tmp/frame.jpg');
    expect(mod.detectOnImage).toHaveBeenCalledWith('file:///tmp/frame.jpg');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('left_shoulder_1_joint');
  });

  it('detectPose rejects when the engine is not ready', async () => {
    await expect(detectPose('x')).rejects.toThrow(/not ready/);
  });
});
