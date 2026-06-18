/**
 * useComparison — Hook tests
 * useComparePanel is mocked with a per-videoId registry of mutable panels so
 * we can verify the orchestration only: slot seeding, the picker flow, and
 * the Sync coupling (gating, offset cross-drive on scrub, shared transport).
 */

import { act, renderHook } from '@testing-library/react-native';

import { useComparison } from '../useComparison';

interface MockPanel {
  videoId: string | null;
  status: string;
  impactMs: number | null;
  currentMs: number;
  isPlaying: boolean;
  seekMs: jest.Mock;
  play: jest.Mock;
  pause: jest.Mock;
  toggle: jest.Mock;
}

jest.mock('../useComparePanel', () => {
  const panels: Record<string, MockPanel> = {};
  const keyOf = (videoId: string | null) => videoId ?? '__empty__';
  const make = (videoId: string | null): MockPanel => {
    const key = keyOf(videoId);
    if (!panels[key]) {
      panels[key] = {
        videoId,
        status: videoId ? 'ready' : 'empty',
        impactMs: null,
        currentMs: 0,
        isPlaying: false,
        seekMs: jest.fn(),
        play: jest.fn(),
        pause: jest.fn(),
        toggle: jest.fn(),
      };
    }
    panels[key].videoId = videoId;
    return panels[key];
  };
  return {
    useComparePanel: ({ videoId }: { videoId: string | null }) => make(videoId),
    __panels: panels,
  };
});

const panels = (
  jest.requireMock('../useComparePanel') as { __panels: Record<string, MockPanel> }
).__panels;

// Lazily-created (on first render) — `get` narrows away `| undefined`.
const get = (key: string): MockPanel => {
  const p = panels[key];
  if (!p) throw new Error(`panel "${key}" not created yet`);
  return p;
};

beforeEach(() => {
  for (const key of Object.keys(panels)) delete panels[key];
});

describe('useComparison', () => {
  it('starts with two empty slots and no picker', () => {
    const { result } = renderHook(() => useComparison());
    expect(result.current.panelA.videoId).toBeNull();
    expect(result.current.panelB.videoId).toBeNull();
    expect(result.current.pickerOpenFor).toBeNull();
  });

  it('seeds slots from initial ids', () => {
    const { result } = renderHook(() =>
      useComparison({ initialVideoIdA: 'a', initialVideoIdB: 'b' }),
    );
    expect(result.current.panelA.videoId).toBe('a');
    expect(result.current.panelB.videoId).toBe('b');
  });

  it('opens the picker for a slot and fills it on choose', () => {
    const { result } = renderHook(() => useComparison());

    act(() => result.current.openPicker('A'));
    expect(result.current.pickerOpenFor).toBe('A');

    act(() => result.current.chooseVideo('v1'));
    expect(result.current.panelA.videoId).toBe('v1');
    expect(result.current.panelB.videoId).toBeNull();
    expect(result.current.pickerOpenFor).toBeNull();
  });

  it('fills slot B independently', () => {
    const { result } = renderHook(() => useComparison());
    act(() => result.current.openPicker('B'));
    act(() => result.current.chooseVideo('v2'));
    expect(result.current.panelB.videoId).toBe('v2');
    expect(result.current.panelA.videoId).toBeNull();
  });

  it('closes the picker without choosing', () => {
    const { result } = renderHook(() => useComparison());
    act(() => result.current.openPicker('A'));
    act(() => result.current.closePicker());
    expect(result.current.pickerOpenFor).toBeNull();
    expect(result.current.panelA.videoId).toBeNull();
  });

  // ─── Sync ────────────────────────────────────────────────────────────────

  it('cannot sync until both panels have an impact marked', () => {
    const { result } = renderHook(() =>
      useComparison({ initialVideoIdA: 'a', initialVideoIdB: 'b' }),
    );
    expect(result.current.canSync).toBe(false);

    get('a').impactMs = 1000; // only A marked
    act(() => result.current.toggleSync());
    expect(result.current.syncOn).toBe(false);
  });

  it('aligns B onto A at the impact offset when sync turns on', () => {
    const { result } = renderHook(() =>
      useComparison({ initialVideoIdA: 'a', initialVideoIdB: 'b' }),
    );
    get('a').impactMs = 1000;
    get('b').impactMs = 3000;
    get('a').currentMs = 0;

    act(() => result.current.toggleSync());

    expect(result.current.syncOn).toBe(true);
    expect(result.current.canSync).toBe(true);
    // B lands at A's position + (impactB - impactA) = 0 + 2000.
    expect(get('b').seekMs).toHaveBeenLastCalledWith(2000);
  });

  it('cross-drives the other timeline on scrub while synced', () => {
    const { result } = renderHook(() =>
      useComparison({ initialVideoIdA: 'a', initialVideoIdB: 'b' }),
    );
    get('a').impactMs = 1000;
    get('b').impactMs = 3000;
    act(() => result.current.toggleSync());
    get('b').seekMs.mockClear();

    act(() => result.current.panelA.seekMs(1500));

    expect(get('a').seekMs).toHaveBeenLastCalledWith(1500);
    // 1500 + (3000 - 1000) = 3500.
    expect(get('b').seekMs).toHaveBeenLastCalledWith(3500);
  });

  it('shares play/pause across both panels while synced', () => {
    const { result } = renderHook(() =>
      useComparison({ initialVideoIdA: 'a', initialVideoIdB: 'b' }),
    );
    get('a').impactMs = 1000;
    get('b').impactMs = 3000;
    act(() => result.current.toggleSync());

    act(() => result.current.panelA.toggle());
    expect(get('a').play).toHaveBeenCalled();
    expect(get('b').play).toHaveBeenCalled();
  });

  it('does not cross-drive when sync is off', () => {
    const { result } = renderHook(() =>
      useComparison({ initialVideoIdA: 'a', initialVideoIdB: 'b' }),
    );
    act(() => result.current.panelA.seekMs(1500));
    expect(get('a').seekMs).toHaveBeenLastCalledWith(1500);
    expect(get('b').seekMs).not.toHaveBeenCalled();
  });

  it('drops sync if a panel loses its impact', () => {
    const { result } = renderHook(() =>
      useComparison({ initialVideoIdA: 'a', initialVideoIdB: 'b' }),
    );
    get('a').impactMs = 1000;
    get('b').impactMs = 3000;
    act(() => result.current.toggleSync());
    expect(result.current.syncOn).toBe(true);

    // A's video swapped → its impact resets; a re-render re-evaluates canSync.
    get('a').impactMs = null;
    act(() => result.current.openPicker('A'));
    expect(result.current.syncOn).toBe(false);
  });
});
