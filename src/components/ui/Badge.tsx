/**
 * Badge — UI primitive
 * Inline pill label for club type, severity, status. Five variants per
 * DESIGN_SYSTEM.md §5 with hand-picked background/text/border colors —
 * the non-semantic colors here are intentionally NOT in the theme tokens
 * because they exist only as badge fills and would dilute the palette.
 */

import { StyleSheet, Text, View } from 'react-native';

import { colors, layout, spacing, typography } from '@/theme';

export type BadgeVariant =
  | 'gold'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral';

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

export interface BadgePalette {
  bg: string;
  text: string;
  border: string;
}

// Hex values per DESIGN_SYSTEM.md §5 Badge spec. Kept local to the badge
// family — these are badge fills and shouldn't proliferate as ad-hoc hex.
// Exported so components that extend the badge visual language (e.g. the
// analysis IssueCard's severity icon tile) reuse the exact same fills
// instead of duplicating them (AI_IMPLEMENTATION_GUIDE §2 — reuse first).
export const BADGE_PALETTE: Record<BadgeVariant, BadgePalette> = {
  gold: {
    bg: colors.gold.dim,
    text: colors.gold.text,
    border: colors.gold.muted,
  },
  success: { bg: '#1A3D2B', text: '#6DC98A', border: '#2D6644' },
  warning: { bg: '#3D2A10', text: '#E09040', border: '#6B4A20' },
  error: { bg: '#3D1515', text: '#E07070', border: '#6B2525' },
  neutral: {
    bg: colors.border.subtle,
    text: colors.text.secondary,
    border: colors.border.default,
  },
};

export function Badge({
  label,
  variant = 'neutral',
  size = 'md',
}: BadgeProps) {
  const palette = BADGE_PALETTE[variant];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        isSmall ? styles.sizeSm : styles.sizeMd,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
      accessibilityRole="text">
      <Text
        style={[
          isSmall ? styles.labelSm : styles.labelMd,
          { color: palette.text },
        ]}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: layout.borderRadius.full,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sizeSm: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  sizeMd: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  labelSm: {
    ...typography.caption,
    fontWeight: '600',
  },
  labelMd: {
    ...typography.label,
    fontWeight: '600',
  },
});
