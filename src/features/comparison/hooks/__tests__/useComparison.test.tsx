/**
 * useComparison — Hook tests
 * useComparePanel is mocked (it has its own tests) so this verifies the
 * orchestration only: slot seeding, the picker open/choose/close flow, and
 * that choosing fills the slot whose picker is open.
 */

import { act, renderHook } from '@testing-library/react-native';

import { useComparison } from '../useComparison';

jest.mock('../useComparePanel', () => ({
  useComparePanel: ({ videoId }: { videoId: string | null }) => ({
    videoId,
    status: videoId ? 'ready' : 'empty',
  }),
}));

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
});
