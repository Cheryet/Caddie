/**
 * User — Type
 * Project-wide alias for the Supabase auth User. We re-export rather than
 * import directly from `@supabase/supabase-js` everywhere so the swap is
 * trivial if the SDK ever changes its shape.
 *
 * Used by: useAppStore, useAuth (Phase 0.6).
 */

export type { User } from '@supabase/supabase-js';
