/**
 * Toggle — Component tests
 * Verifies the controlled switch fires with the negated value, no-ops when
 * disabled, and exposes its checked state for accessibility.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { Toggle } from '../Toggle';

describe('Toggle', () => {
  it('fires onValueChange with the negated value', () => {
    const onValueChange = jest.fn();
    const { getByLabelText } = render(
      <Toggle value={false} onValueChange={onValueChange} accessibilityLabel="Test toggle" />,
    );
    fireEvent.press(getByLabelText('Test toggle'));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('does not fire when disabled', () => {
    const onValueChange = jest.fn();
    const { getByLabelText } = render(
      <Toggle
        value={false}
        onValueChange={onValueChange}
        disabled
        accessibilityLabel="Test toggle"
      />,
    );
    fireEvent.press(getByLabelText('Test toggle'));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('reports its checked state', () => {
    const { getByLabelText } = render(
      <Toggle value onValueChange={() => {}} accessibilityLabel="On switch" />,
    );
    expect(getByLabelText('On switch').props.accessibilityState).toMatchObject({
      checked: true,
    });
  });
});
