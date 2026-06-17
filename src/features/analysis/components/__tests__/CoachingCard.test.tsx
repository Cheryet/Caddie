/**
 * CoachingCard — Component tests
 * Verifies the coach summary and its attribution render.
 */

import { render } from '@testing-library/react-native';

import { CoachingCard } from '../CoachingCard';

describe('CoachingCard', () => {
  it('renders the summary text', () => {
    const summary = 'Smooth tempo and great width — the trail elbow is the one leak.';
    const { getByText } = render(<CoachingCard summary={summary} />);
    expect(getByText(summary)).toBeTruthy();
  });

  it('renders the AI attribution', () => {
    const { getByText } = render(<CoachingCard summary="Nice swing." />);
    expect(getByText('Caddie AI · this swing')).toBeTruthy();
  });
});
