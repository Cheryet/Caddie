/**
 * useTrim — Hook tests
 * Covers open + thumbnail load, range commit (valid / near-full / too
 * short), and materialize (original passthrough vs trimmed re-encode).
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/core/trim', () => ({
  trimVideo: jest.fn(async () => ({
    uri: 'file:///tmp/trimmed.mp4',
    durationMs: 4000,
  })),
}));
jest.mock('@/core/pose', () => ({
  extractFrameJpegs: jest.fn(async () => ['aaa', 'bbb', 'ccc']),
}));

const { trimVideo } = require('@/core/trim') as { trimVideo: jest.Mock };
const { extractFrameJpegs } = require('@/core/pose') as {
  extractFrameJpegs: jest.Mock;
};
const { useTrim } = require('../useTrim');

const ARGS = { uri: 'file:///in.mov', durationMs: 10000 };

beforeEach(() => jest.clearAllMocks());

describe('useTrim', () => {
  it('starts closed with no trim', () => {
    const { result } = renderHook(() => useTrim(ARGS));
    expect(result.current.isOpen).toBe(false);
    expect(result.current.range).toBeNull();
    expect(result.current.hasTrim).toBe(false);
  });

  it('loads filmstrip thumbnails as data URIs on first open', async () => {
    const { result } = renderHook(() => useTrim(ARGS));
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    await waitFor(() => expect(result.current.thumbsStatus).toBe('ready'));
    expect(extractFrameJpegs).toHaveBeenCalledTimes(1);
    expect(result.current.thumbnails[0]).toBe('data:image/jpeg;base64,aaa');
  });

  it('commits a valid range and reports hasTrim', () => {
    const { result } = renderHook(() => useTrim(ARGS));
    act(() => result.current.commit(2000, 6000));
    expect(result.current.range).toEqual({ startMs: 2000, endMs: 6000 });
    expect(result.current.hasTrim).toBe(true);
    expect(result.current.isOpen).toBe(false);
  });

  it('treats a near-full selection as no trim', () => {
    const { result } = renderHook(() => useTrim(ARGS));
    act(() => result.current.commit(0, 10000));
    expect(result.current.range).toBeNull();
    expect(result.current.hasTrim).toBe(false);
  });

  it('ignores a sub-minimum selection', () => {
    const { result } = renderHook(() => useTrim(ARGS));
    act(() => result.current.commit(0, 500));
    expect(result.current.range).toBeNull();
  });

  it('materialize returns the original uri (null duration) when untrimmed', async () => {
    const { result } = renderHook(() => useTrim(ARGS));
    const clip = await result.current.materialize('file:///orig.mov');
    expect(clip).toEqual({ uri: 'file:///orig.mov', durationMs: null });
    expect(trimVideo).not.toHaveBeenCalled();
  });

  it('materialize re-encodes when a range is set', async () => {
    const { result } = renderHook(() => useTrim(ARGS));
    act(() => result.current.commit(2000, 6000));
    const clip = await result.current.materialize('file:///orig.mov');
    expect(trimVideo).toHaveBeenCalledWith('file:///orig.mov', 2000, 6000);
    expect(clip).toEqual({ uri: 'file:///tmp/trimmed.mp4', durationMs: 4000 });
  });
});
