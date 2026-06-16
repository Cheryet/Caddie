/**
 * ClubChips — Smoke test for the extracted control
 * Verifies every entry in CLUBS renders as a chip, the active one
 * reflects via a11y state, and tapping a chip fires onChange.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { CLUBS } from '@/constants/clubs';

import { ClubChips } from '../ClubChips';

describe('ClubChips', () => {
  it('renders one chip per club', () => {
    const { getAllByRole } = render(
      <ClubChips value="7 Iron" onChange={jest.fn()} />,
    );
    expect(getAllByRole('button')).toHaveLength(CLUBS.length);
  });

  it('marks the active chip via a11y state', () => {
    const { getAllByRole } = render(
      <ClubChips value="7 Iron" onChange={jest.fn()} />,
    );
    const selected = getAllByRole('button').find(
      n => n.props.accessibilityState?.selected,
    );
    expect(selected).toBeTruthy();
    const selectedIndex = getAllByRole('button').indexOf(selected!);
    expect(CLUBS[selectedIndex]).toBe('7 Iron');
  });

  it('fires onChange when a chip is pressed', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <ClubChips value="7 Iron" onChange={onChange} />,
    );
    fireEvent.press(getByText('Driver'));
    expect(onChange).toHaveBeenCalledWith('Driver');
  });
});
