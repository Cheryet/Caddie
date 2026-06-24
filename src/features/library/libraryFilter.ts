/**
 * libraryFilter — Pure helpers
 * Client-side search + quick-filter for the LibraryScreen grid (Design §04:
 * the "Search by club or date" field and the All / Driver / Irons / Analysed
 * chips). Kept as a pure function so it's unit-tested and the screen only
 * feeds it the current query + selected chip.
 *
 * Client-side is fine while a user's library is small (<~500 rows); past
 * that, push the predicate into the Supabase query in useVideos.
 *
 * Used by: LibraryScreen, LibraryFilterBar (chip metadata).
 */

import type { Video } from '@/features/library/hooks/useVideos';

export type LibraryFilter = 'all' | 'driver' | 'irons' | 'analysed';

export const LIBRARY_FILTERS: readonly { key: LibraryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'driver', label: 'Driver' },
  { key: 'irons', label: 'Irons' },
  { key: 'analysed', label: 'Analysed' },
] as const;

function matchesChip(video: Video, filter: LibraryFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'driver':
      return video.clubType === 'Driver';
    case 'irons':
      // Numbered irons ("3 Iron" … "9 Iron"); wedges/woods are excluded.
      return video.clubType != null && video.clubType.includes('Iron');
    case 'analysed':
      return video.hasAnalysis;
  }
}

function matchesQuery(video: Video, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  const haystack = `${video.title} ${video.clubType ?? ''}`.toLowerCase();
  return haystack.includes(needle);
}

export function filterVideos(
  videos: Video[],
  options: { query: string; filter: LibraryFilter },
): Video[] {
  return videos.filter(
    video =>
      matchesChip(video, options.filter) && matchesQuery(video, options.query),
  );
}
