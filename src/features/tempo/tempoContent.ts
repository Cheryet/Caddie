/**
 * tempoContent — Pure helpers + constants
 * The non-UI, non-audio logic of the tempo trainer: BPM clamping, the tempo
 * "term" label, and (de)serialising the four preset slots to/from the
 * Postgres `integer[]` column. Pure (same input → same output) so they
 * unit-test in isolation and `useTempo` stays focused on state + effects.
 *
 * Boundaries are verbatim from Design/Caddie Screens.dc.html §07 (prototype
 * L1864, L1897).
 *
 * Used by: useTempo, TempoScreen, PresetRow.
 */

export const BPM_MIN = 30;
export const BPM_MAX = 240;
export const DEFAULT_BPM = 72;
export const PRESET_COUNT = 4;

/** Starting slots before the user saves their own (prototype default). */
export const DEFAULT_PRESETS: readonly (number | null)[] = [66, 76, 84, null];

/** `integer[]` can't hold null and a valid BPM is ≥ 30, so 0 marks an empty
 *  slot — this keeps slot positions stable across a save/load round-trip. */
const EMPTY_SLOT = 0;

/** Round to the nearest integer and clamp into the playable range. */
export function clampBpm(value: number): number {
  if (Number.isNaN(value)) return BPM_MIN;
  const rounded = Math.round(value);
  if (rounded < BPM_MIN) return BPM_MIN;
  if (rounded > BPM_MAX) return BPM_MAX;
  return rounded;
}

export type TempoTerm = 'Slow' | 'Smooth' | 'Balanced' | 'Quick' | 'Fast';

/** The neutral descriptor shown in the header pill. */
export function tempoTerm(bpm: number): TempoTerm {
  if (bpm < 60) return 'Slow';
  if (bpm < 78) return 'Smooth';
  if (bpm < 100) return 'Balanced';
  if (bpm < 132) return 'Quick';
  return 'Fast';
}

/** Stored `bpm_values` → fixed-length slot array (0/invalid → empty). */
export function bpmValuesToSlots(
  values: number[] | null | undefined,
): (number | null)[] {
  const slots: (number | null)[] = [];
  for (let i = 0; i < PRESET_COUNT; i++) {
    const v = values?.[i];
    slots.push(typeof v === 'number' && v >= BPM_MIN && v <= BPM_MAX ? v : null);
  }
  return slots;
}

/** Slot array → fixed-length `bpm_values` payload (empty → 0 sentinel). */
export function slotsToBpmValues(slots: readonly (number | null)[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < PRESET_COUNT; i++) {
    const v = slots[i];
    out.push(typeof v === 'number' ? v : EMPTY_SLOT);
  }
  return out;
}
