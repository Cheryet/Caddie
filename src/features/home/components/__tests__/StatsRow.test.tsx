/**
 * StatsRow — Component tests
 * Verifies the three stat values and their captions render.
 */

import { render } from '@testing-library/react-native';

import { StatsRow } from '../StatsRow';

describe('StatsRow', () => {
  it('renders the three stat values and labels', () => {
    const { getByText } = render(
      <StatsRow swings={34} analyses={6} streakDays={12} />,
    );
    expect(getByText('34')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    expect(getByText('swings')).toBeTruthy();
    expect(getByText('analyses')).toBeTruthy();
    expect(getByText('day streak')).toBeTruthy();
  });
});
