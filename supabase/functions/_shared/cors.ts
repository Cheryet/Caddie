/**
 * Shared CORS headers for Caddie Edge Functions.
 * The app calls these from React Native (no browser preflight), but the
 * headers keep local `curl`/browser testing and any future web client
 * working. Kept permissive on origin — auth is enforced by JWT, not origin.
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
