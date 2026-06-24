/**
 * severity — Analysis feature mapping
 * The single source for turning a `SwingIssue` severity into its Badge
 * variant + display label. Extracted from IssueCard so the IssueCard, the
 * InsightFrame fallback tile, and the InsightDetailScreen all share one
 * mapping instead of redeclaring it (AI_IMPLEMENTATION_GUIDE §2 — reuse
 * before create).
 *
 * Part of: src/features/analysis/
 */

import type { BadgeVariant } from '@/components/ui';
import type { IssueSeverity } from '@/types/analysis';

/** Severity → Badge variant (drives the badge + the severity icon tile). */
export const SEVERITY_VARIANT: Record<IssueSeverity, BadgeVariant> = {
  minor: 'success',
  moderate: 'warning',
  major: 'error',
};

/** Severity → capitalised badge label. */
export const SEVERITY_LABEL: Record<IssueSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
};
