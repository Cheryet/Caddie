/**
 * trimming/constants — Tunables for the trim feature.
 */

/**
 * Minimum trimmed-clip length. Below this a cut isn't useful for a swing
 * and AVAssetExportSession can choke on a near-zero range. The TrimBar
 * stops the handles from crossing closer than this.
 */
export const MIN_TRIM_DURATION_MS = 800;

/** Number of thumbnails sampled across the clip for the filmstrip. */
export const FILMSTRIP_THUMB_COUNT = 10;

/** Long-side px cap per filmstrip thumbnail (small = fast + cheap decode). */
export const FILMSTRIP_THUMB_SIZE = 160;

/** JPEG quality (0–100) for filmstrip thumbnails. */
export const FILMSTRIP_THUMB_QUALITY = 50;
