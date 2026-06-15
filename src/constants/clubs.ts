/**
 * clubs — Constant
 * Canonical list of golf clubs presented in the capture chip strip
 * (CameraScreen) and the library filter pills (Phase 1.5). Order
 * follows the typical bag layout — woods first, then irons descending
 * by loft (3I is the lowest-lofted iron in most bags after the woods),
 * then wedges, then putter.
 *
 * If a swing's club isn't selectable from this list the user picks
 * "Other" — represented by `null` in the database and absent from this
 * constant. Don't put "Other" in this array; the UI handles it as a
 * trailing affordance.
 *
 * Source of truth: PROJECT_SPEC.md §4 (MVP video capture — club type
 * selector persists last selection).
 */

export type ClubType =
  | 'Driver'
  | '3 Wood'
  | '5 Wood'
  | 'Hybrid'
  | '3 Iron'
  | '4 Iron'
  | '5 Iron'
  | '6 Iron'
  | '7 Iron'
  | '8 Iron'
  | '9 Iron'
  | 'PW'
  | 'GW'
  | 'SW'
  | 'LW'
  | 'Putter';

export const CLUBS: readonly ClubType[] = [
  'Driver',
  '3 Wood',
  '5 Wood',
  'Hybrid',
  '3 Iron',
  '4 Iron',
  '5 Iron',
  '6 Iron',
  '7 Iron',
  '8 Iron',
  '9 Iron',
  'PW',
  'GW',
  'SW',
  'LW',
  'Putter',
] as const;

/** Default club used on first launch and as a fallback. */
export const DEFAULT_CLUB: ClubType = '7 Iron';
