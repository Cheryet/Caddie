/**
 * IssueList — Component + ordering tests
 * The pure `orderIssuesBySeverity` is tested directly (most → least severe,
 * stable within a severity, no input mutation). The component is checked for
 * the section header, a card per issue, and the null-when-empty behaviour.
 */

import { render } from '@testing-library/react-native';

import { IssueList, orderIssuesBySeverity } from '../IssueList';
import type { IssueSeverity, SwingIssue } from '@/types/analysis';

function makeIssue(name: string, severity: IssueSeverity): SwingIssue {
  return { name, severity, frameIndex: 0, description: `${name} desc`, fix: `${name} fix` };
}

describe('orderIssuesBySeverity', () => {
  it('orders major → moderate → minor', () => {
    const ordered = orderIssuesBySeverity([
      makeIssue('a', 'minor'),
      makeIssue('b', 'major'),
      makeIssue('c', 'moderate'),
    ]);
    expect(ordered.map(i => i.name)).toEqual(['b', 'c', 'a']);
  });

  it('is stable within the same severity', () => {
    const ordered = orderIssuesBySeverity([
      makeIssue('first', 'major'),
      makeIssue('second', 'major'),
    ]);
    expect(ordered.map(i => i.name)).toEqual(['first', 'second']);
  });

  it('does not mutate the input array', () => {
    const input = [makeIssue('a', 'minor'), makeIssue('b', 'major')];
    orderIssuesBySeverity(input);
    expect(input.map(i => i.name)).toEqual(['a', 'b']);
  });
});

describe('IssueList', () => {
  it('renders the section header and one card per issue', () => {
    const { getByText } = render(
      <IssueList
        issues={[makeIssue('Elbow', 'major'), makeIssue('Hips', 'moderate')]}
      />,
    );
    expect(getByText('What to work on')).toBeTruthy();
    expect(getByText('Elbow')).toBeTruthy();
    expect(getByText('Hips')).toBeTruthy();
  });

  it('renders nothing when there are no issues', () => {
    const { queryByText } = render(<IssueList issues={[]} />);
    expect(queryByText('What to work on')).toBeNull();
  });
});
