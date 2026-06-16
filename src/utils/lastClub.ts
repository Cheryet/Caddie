/**
 * lastClub — Utility
 * Single source of truth for the "last club used" MMKV key and the
 * read/write helpers around it. Persists across launches so the camera
 * and import flows both default to the user's most-recent selection
 * (PROJECT_SPEC.md §4 line 62 — "persists last selection").
 *
 * Why both readers go through this util: the import flow (Phase 1.6)
 * and the camera flow (Phase 1.3) need to share the same default, and
 * inlining the key string in both screens would silently drift.
 */

import { CLUBS, DEFAULT_CLUB } from '@/constants/clubs';
import type { ClubType } from '@/constants/clubs';
import { mmkv } from '@/core/mmkv/client';

export const LAST_CLUB_KEY = 'camera.lastClub';

/**
 * Read the most recently used club from MMKV, falling back to the
 * canonical default. Validates against the current CLUBS list — a
 * removed club from a previous build resets to default.
 */
export function loadLastClub(): ClubType {
  const raw = mmkv.getString(LAST_CLUB_KEY);
  if (raw && (CLUBS as readonly string[]).includes(raw)) {
    return raw as ClubType;
  }
  return DEFAULT_CLUB;
}

export function setLastClub(club: ClubType): void {
  mmkv.set(LAST_CLUB_KEY, club);
}
