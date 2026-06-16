/**
 * HandSegmented — Smoke test for the extracted control
 * Covers value flip + disabled gate. Icon presence is implicit (the SVG
 * mock just renders inert Views, so we don't assert on the icon itself).
 */

import { fireEvent, render } from '@testing-library/react-native';

import { HandSegmented } from '../HandSegmented';

describe('HandSegmented', () => {
  it('marks the active tab via a11y state', () => {
    const { getAllByRole } = render(
      <HandSegmented value="left" onChange={jest.fn()} />,
    );
    const tabs = getAllByRole('tab');
    expect(tabs[0]!.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
    expect(tabs[1]!.props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it('fires onChange with the new value', () => {
    const onChange = jest.fn();
    const { getAllByRole } = render(
      <HandSegmented value="right" onChange={onChange} />,
    );
    fireEvent.press(getAllByRole('tab')[1]!);
    expect(onChange).toHaveBeenCalledWith('left');
  });
});
