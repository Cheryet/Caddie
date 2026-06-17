/**
 * IssueCard — Component tests
 * Verifies the fault name, description, fix, and severity badge render, and
 * that all three severities render without error (each draws its own glyph).
 */

import { render } from '@testing-library/react-native';

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
  it('renders name, description and fix', () => {
    const { getByText } = render(<IssueCard issue={makeIssue('major')} />);
    expect(getByText('Flying trail elbow')).toBeTruthy();
    expect(
      getByText('Your trail elbow separates at the top of the backswing.'),
    ).toBeTruthy();
    expect(
      getByText('Feel it stay connected to your side coming down.'),
    ).toBeTruthy();
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
});
