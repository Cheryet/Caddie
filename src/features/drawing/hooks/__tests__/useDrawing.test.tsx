/**
 * useDrawing — Hook tests
 * Verifies the tool toggle, derived `enabled`, and stroke lifecycle.
 */

import { act, renderHook } from '@testing-library/react-native';

import { useDrawing } from '../useDrawing';

describe('useDrawing', () => {
  it('starts with no tool selected and the canvas disabled', () => {
    const { result } = renderHook(() => useDrawing());
    expect(result.current.tool).toBe('none');
    expect(result.current.enabled).toBe(false);
    expect(result.current.isStroking).toBe(false);
  });

  it('selecting a tool enables the canvas', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    expect(result.current.tool).toBe('line');
    expect(result.current.enabled).toBe(true);
  });

  it('switching back to "none" disables the canvas', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('freehand'));
    act(() => result.current.setTool('none'));
    expect(result.current.enabled).toBe(false);
  });

  it('stroke lifecycle toggles isStroking', () => {
    const { result } = renderHook(() => useDrawing());
    act(() => result.current.setTool('line'));
    act(() => result.current.onStrokeStart({ x: 10, y: 20 }));
    expect(result.current.isStroking).toBe(true);
    act(() => result.current.onStrokeMove({ x: 12, y: 25 }));
    expect(result.current.isStroking).toBe(true);
    act(() => result.current.onStrokeEnd());
    expect(result.current.isStroking).toBe(false);
  });
});
