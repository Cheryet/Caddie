/**
 * colors — Theme tokens
 * The full color palette for the app. Reference these tokens for every
 * visual color value; never hardcode a hex code in a component file.
 * Source of truth: DESIGN_SYSTEM.md §2
 */

export const colors = {
  // Backgrounds — layered depth system
  bg: {
    base: '#0A0A0A', // true black — screen backgrounds, video chrome
    elevated: '#111111', // cards, sheets resting on base
    overlay: '#1A1A1A', // modals, popovers, second-level cards
    input: '#1E1E1E', // input fields, selects
  },

  // Borders
  border: {
    subtle: '#1F1F1F', // dividers, card outlines (barely visible)
    default: '#2A2A2A', // standard borders
    strong: '#3A3A3A', // active/focused borders
  },

  // Text
  text: {
    primary: '#F0EDE8', // near-white with warm tint — main body text
    secondary: '#8A8580', // labels, metadata, timestamps
    tertiary: '#5A5652', // placeholders, disabled text
    inverse: '#0A0A0A', // text on gold backgrounds
  },

  // Primary accent — gold
  gold: {
    dim: '#6B5520', // very subtle gold tint (backgrounds, badge fills)
    muted: '#8A6E2E', // secondary gold use (icons, borders)
    default: '#C9A84C', // primary — CTAs, active tabs, highlights
    bright: '#E2BF6A', // hover / pressed state on gold
    text: '#F5DFA0', // gold text on dark background (readable)
  },

  // Semantic
  semantic: {
    success: '#4A9B6F', // green — positive scores, good metrics
    warning: '#C47D2A', // amber — moderate issues
    error: '#C94A4A', // red — major issues, errors
    info: '#4A7EC9', // blue — informational, neutral tips
  },

  // Swing issue severity (maps to semantic)
  severity: {
    minor: '#4A9B6F', // = success
    moderate: '#C47D2A', // = warning
    major: '#C94A4A', // = error
  },

  // Drawing tool colors (fixed palette for annotations)
  drawing: {
    white: '#F0EDE8',
    gold: '#C9A84C',
    red: '#E05555',
    blue: '#4A9EDB',
  },

  // Pose skeleton overlay (DESIGN_SYSTEM §14) — gold at varying alpha
  pose: {
    bone: 'rgba(201, 168, 76, 0.6)', // 2px skeleton lines
    joint: 'rgba(201, 168, 76, 0.9)', // standard joint dots
    jointKey: '#C9A84C', // key joints (wrists, hips, shoulders) = gold.default
    headFill: 'rgba(201, 168, 76, 0.25)', // translucent head circle fill
    headStroke: 'rgba(201, 168, 76, 0.6)', // head circle outline
  },

  // Always available regardless of theme
  always: {
    black: '#000000',
    white: '#FFFFFF',
    transparent: 'transparent',
  },
} as const;

export type ColorToken = typeof colors;
