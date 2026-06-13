/**
 * typography — Theme tokens
 * The full type scale. Every text style in the app comes from this file —
 * never set fontSize/fontWeight/color inline. Sentence case everywhere
 * except the `overline` token.
 * Source of truth: DESIGN_SYSTEM.md §3
 */

import { colors } from './colors';

export const typography = {
  // Display — screen titles, big numbers
  display: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },

  // Title — section headers, card titles
  title1: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  title2: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    color: colors.text.primary,
  },
  title3: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
    color: colors.text.primary,
  },

  // Body
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 22,
    color: colors.text.primary,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0,
    color: colors.text.primary,
  },

  // UI labels
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    color: colors.text.secondary,
  },
  labelStrong: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    color: colors.text.primary,
  },

  // Captions / metadata
  caption: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
    color: colors.text.tertiary,
  },
  captionStrong: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    color: colors.text.secondary,
  },

  // Data / monospace — scores, BPM, frame counts
  data: {
    fontSize: 28,
    fontFamily: 'Courier New',
    fontWeight: '700' as const,
    letterSpacing: -1,
    color: colors.text.primary,
  },
  dataSmall: {
    fontSize: 16,
    fontFamily: 'Courier New',
    fontWeight: '600' as const,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },

  // Overline — small all-caps category labels
  overline: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: colors.text.tertiary,
  },
} as const;

export type TypographyToken = typeof typography;
