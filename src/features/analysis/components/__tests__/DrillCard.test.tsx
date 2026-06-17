/**
 * DrillCard — Component tests
 * Covers the title/detail render, and that the gold "Start" CTA only appears
 * when `onStart` is supplied (no dead button) and fires when tapped.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { DrillCard } from '../DrillCard';

describe('DrillCard', () => {
  it('renders the title and detail', () => {
    const { getByText } = render(
      <DrillCard title="Towel drill" detail="4 min · 3 reps" />,
    );
    expect(getByText('Towel drill')).toBeTruthy();
    expect(getByText('4 min · 3 reps')).toBeTruthy();
  });

  it('omits the Start CTA when there is nothing to launch', () => {
    const { queryByText } = render(<DrillCard title="Towel drill" />);
    expect(queryByText('Start')).toBeNull();
  });

  it('renders and fires the Start CTA when onStart is provided', () => {
    const onStart = jest.fn();
    const { getByText } = render(
      <DrillCard title="Towel drill" onStart={onStart} />,
    );
    fireEvent.press(getByText('Start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
