/**
 * spacing — Theme tokens
 * 4pt base grid. Every margin/padding/gap in the app comes from `spacing`
 * or `layout` — never hardcode a magic number.
 * Source of truth: DESIGN_SYSTEM.md §4
 */

export const spacing = {
  px: 1, // hairline — borders only
  0.5: 2, // micro — icon gaps
  1: 4, // xs
  2: 8, // sm
  3: 12, // md-sm
  4: 16, // md — standard screen padding
  5: 20, // md-lg
  6: 24, // lg
  8: 32, // xl
  10: 40, // 2xl
  12: 48, // 3xl
  16: 64, // 4xl
  20: 80, // section gaps
} as const;

// Standard values to use by default
export const layout = {
  screenPaddingH: 16, // horizontal padding on all screens
  screenPaddingV: 20, // top/bottom padding on all screens
  cardPadding: 16, // inner padding on Card components
  sectionGap: 32, // vertical gap between screen sections
  itemGap: 12, // gap between list/grid items
  iconSize: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 999,
  },
} as const;

export type SpacingToken = typeof spacing;
export type LayoutToken = typeof layout;
