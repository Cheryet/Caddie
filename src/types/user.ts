/**
 * User — Type
 * Minimal user shape used by the global auth store. Phase 0.5 replaces
 * this with a re-export of @supabase/supabase-js's User type once the
 * SDK is installed; the rest of the app continues to import from here.
 */

export interface User {
  id: string;
  email: string | null;
}
