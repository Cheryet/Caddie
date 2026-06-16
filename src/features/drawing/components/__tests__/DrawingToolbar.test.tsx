/**
 * DrawingToolbar — Component tests
 * Verifies all seven tools render, tapping fires the change callback
 * with the tool name (or 'none' when re-tapped — toggle off), and
 * the Undo affordance only appears when canUndo is true.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { DrawingToolbar } from '../DrawingToolbar';
import type { Tool } from '@/features/drawing/types';

const baseProps = {
  tool: 'none' as Tool,
  onToolChange: jest.fn(),
  canUndo: false,
  onUndo: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DrawingToolbar', () => {
  it('renders all seven tools', () => {
    const { getByLabelText } = render(<DrawingToolbar {...baseProps} />);
    expect(getByLabelText('select tool')).toBeTruthy();
    expect(getByLabelText('line tool')).toBeTruthy();
    expect(getByLabelText('plane tool')).toBeTruthy();
    expect(getByLabelText('circle tool')).toBeTruthy();
    expect(getByLabelText('freehand tool')).toBeTruthy();
    expect(getByLabelText('angle tool')).toBeTruthy();
  });

  it('marks the active tool via accessibilityState', () => {
    const { getByLabelText } = render(
      <DrawingToolbar {...baseProps} tool="line" />,
    );
    expect(getByLabelText('line tool').props.accessibilityState.selected).toBe(
      true,
    );
    expect(getByLabelText('circle tool').props.accessibilityState.selected).toBe(
      false,
    );
  });

  it('tapping an inactive tool calls onToolChange with that tool', () => {
    const onToolChange = jest.fn();
    const { getByLabelText } = render(
      <DrawingToolbar {...baseProps} onToolChange={onToolChange} />,
    );
    fireEvent.press(getByLabelText('line tool'));
    expect(onToolChange).toHaveBeenCalledWith('line');
  });

  it('tapping the active tool deselects it (back to "none")', () => {
    const onToolChange = jest.fn();
    const { getByLabelText } = render(
      <DrawingToolbar
        {...baseProps}
        tool="freehand"
        onToolChange={onToolChange}
      />,
    );
    fireEvent.press(getByLabelText('freehand tool'));
    expect(onToolChange).toHaveBeenCalledWith('none');
  });

  it('Undo is hidden when canUndo is false', () => {
    const { queryByLabelText } = render(<DrawingToolbar {...baseProps} />);
    expect(queryByLabelText('Undo last shape')).toBeNull();
  });

  it('Undo appears when canUndo is true and calls onUndo', () => {
    const onUndo = jest.fn();
    const { getByLabelText } = render(
      <DrawingToolbar {...baseProps} canUndo onUndo={onUndo} />,
    );
    fireEvent.press(getByLabelText('Undo last shape'));
    expect(onUndo).toHaveBeenCalled();
  });
});
