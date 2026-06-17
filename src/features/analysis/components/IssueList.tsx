/**
 * IssueList — Feature component
 * The "What to work on" section: the swing's faults ordered most → least
 * severe, each rendered as an IssueCard. Returns null when there are no
 * issues so a clean swing doesn't show an empty heading. Layout (header +
 * 10px-gap stack) per Design/Caddie Screens.dc.html §03.
 *
 * Part of: src/features/analysis/
 */

import { StyleSheet, View } from 'react-native';

import { IssueCard } from '@/features/analysis/components/IssueCard';
import { SectionLabel } from '@/features/analysis/components/SectionLabel';
import type { IssueSeverity, SwingIssue } from '@/types/analysis';
import { spacing } from '@/theme';

// Higher = more severe = sorted earlier.
const SEVERITY_RANK: Record<IssueSeverity, number> = {
  major: 3,
  moderate: 2,
  minor: 1,
};

/**
 * Order issues most → least severe without mutating the input. Stable
 * within a severity, so Claude's own ranking is preserved among equals.
 * Exported pure so the ordering is unit-tested directly.
 */
export function orderIssuesBySeverity(issues: SwingIssue[]): SwingIssue[] {
  return issues
    .map((issue, index) => ({ issue, index }))
    .sort(
      (a, b) =>
        SEVERITY_RANK[b.issue.severity] - SEVERITY_RANK[a.issue.severity] ||
        a.index - b.index,
    )
    .map(entry => entry.issue);
}

interface IssueListProps {
  issues: SwingIssue[];
}

export function IssueList({ issues }: IssueListProps) {
  if (issues.length === 0) return null;

  const ordered = orderIssuesBySeverity(issues);

  return (
    <View>
      <SectionLabel>What to work on</SectionLabel>
      <View style={styles.list}>
        {ordered.map((issue, index) => (
          <IssueCard key={`${issue.name}-${index}`} issue={issue} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing[2] + 2, // 10 — matches design
  },
});
