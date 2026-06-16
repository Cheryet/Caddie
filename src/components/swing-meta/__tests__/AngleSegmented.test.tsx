/**
 * AngleSegmented — Smoke test for the extracted control
 * Verifies tab semantics, that disabled tabs no-op, and selecting a
 * different value fires the change callback. Tab a11y state matters
 * because we rely on accessibilityState.selected in screen tests.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { AngleSegmented } from '../AngleSegmented';

describe('AngleSegmented', () => {
  it('renders both tabs and marks the active one', () => {
    const { getAllByRole } = render(
      <AngleSegmented value="face-on" onChange={jest.fn()} />,
    );
    const tabs = getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]!.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(tabs[1]!.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
  });

  it('fires onChange with the new value on tab press', () => {
    const onChange = jest.fn();
    const { getAllByRole } = render(
      <AngleSegmented value="face-on" onChange={onChange} />,
    );
    fireEvent.press(getAllByRole('tab')[1]!);
    expect(onChange).toHaveBeenCalledWith('dtl');
  });

  it('does not fire onChange when disabled', () => {
    const onChange = jest.fn();
    const { getAllByRole } = render(
      <AngleSegmented value="face-on" onChange={onChange} disabled />,
    );
    fireEvent.press(getAllByRole('tab')[1]!);
    expect(onChange).not.toHaveBeenCalled();
  });
});
