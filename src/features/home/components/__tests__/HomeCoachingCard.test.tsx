/**
 * HomeCoachingCard — Component tests
 * Verifies the coaching quote renders and the attribution pluralises the
 * span correctly.
 */

import { render } from '@testing-library/react-native';

import { HomeCoachingCard } from '../HomeCoachingCard';

describe('HomeCoachingCard', () => {
  it('renders the coaching text and span attribution', () => {
    const text = 'That trail elbow is your one big leak.';
    const { getByText } = render(
      <HomeCoachingCard text={text} spanCount={6} />,
    );
    expect(getByText(/one big leak/)).toBeTruthy();
    expect(getByText('Caddie AI · across your last 6 swings')).toBeTruthy();
  });

  it('uses the singular swing word for a span of one', () => {
    const { getByText } = render(
      <HomeCoachingCard text="Solid base." spanCount={1} />,
    );
    expect(getByText('Caddie AI · across your last 1 swing')).toBeTruthy();
  });
});
