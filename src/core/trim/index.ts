/**
 * core/trim — Barrel export
 * Public surface for the video-trim abstraction. Importers outside this
 * folder should only reach for these symbols; the underlying
 * `caddie-trim` engine package is intentionally hidden.
 */

export { trimVideo } from './client';
export type { TrimResult } from './client';
