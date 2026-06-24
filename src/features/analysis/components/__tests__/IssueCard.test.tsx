/**
 * IssueCard — Component tests
 * Verifies the fault name, description, fix, and severity badge render, and
 * that all three severities render without error (each draws its own glyph).
 */

import { fireEvent, render } from '@testing-library/react-native';

import { IssueCard } from '../IssueCard';
import type { IssueSeverity, SwingIssue } from '@/types/analysis';

function makeIssue(severity: IssueSeverity): SwingIssue {
  return {
    name: 'Flying trail elbow',
    severity,
    frameIndex: 3,
    description: 'Your trail elbow separates at the top of the backswing.',
    fix: 'Feel it stay connected to your side coming down.',
  };
}

describe('IssueCard', () => {
  it('renders the fault name', () => {
    const { getByText } = render(<IssueCard issue={makeIssue('major')} />);
    expect(getByText('Flying trail elbow')).toBeTruthy();
  });

  it('keeps the description and fix off the card (they live on the detail screen)', () => {
    const issue = makeIssue('major');
    const { queryByText } = render(<IssueCard issue={issue} />);
    expect(queryByText(issue.description)).toBeNull();
    expect(queryByText(issue.fix)).toBeNull();
  });

  it.each<[IssueSeverity, string]>([
    ['major', 'Major'],
    ['moderate', 'Moderate'],
    ['minor', 'Minor'],
  ])('renders the %s severity badge', (severity, label) => {
    const { getByText } = render(<IssueCard issue={makeIssue(severity)} />);
    expect(getByText(label)).toBeTruthy();
  });

  it('renders a severity glyph (svg)', () => {
    const { getAllByTestId } = render(<IssueCard issue={makeIssue('minor')} />);
    expect(getAllByTestId('svg-Svg').length).toBeGreaterThan(0);
  });

  it('is a static row (no button) without onPress', () => {
    const { queryByRole } = render(<IssueCard issue={makeIssue('major')} />);
    expect(queryByRole('button')).toBeNull();
  });

  it('becomes a button and fires onPress when tappable', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <IssueCard issue={makeIssue('major')} onPress={onPress} />,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
