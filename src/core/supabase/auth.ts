/**
 * auth — Core service
 * Typed wrapper around `supabase.auth`. The rest of the app talks to
 * Supabase auth exclusively through this module so error mapping,
 * argument shapes, and session typing live in one place.
 *
 * Errors are returned as a discriminated `AuthError` union (no throws).
 * Callers branch on `result.error` — there are no exceptions to catch.
 *
 * Used by: useAuth (the only consumer outside this folder).
 */

import type {
  AuthError as SupabaseAuthError,
  Session,
  Subscription,
  User,
} from '@supabase/supabase-js';

import { supabase } from './client';

// ───── Error mapping ─────────────────────────────────────────────────────
// Map Supabase's many error codes/messages to a small, typed set that the
// UI can branch on. Anything we don't recognise falls through to
// `unknown` with the original message preserved for logging.

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_already_exists'
  | 'invalid_otp'
  | 'rate_limited'
  | 'network'
  | 'unknown';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

function mapError(err: SupabaseAuthError | null | undefined): AuthError | null {
  if (!err) return null;
  // supabase-js v2 sets `.code` on most auth errors; fall back to message.
  const code = err.code;
  switch (code) {
    case 'invalid_credentials':
      return { code: 'invalid_credentials', message: 'Email or password is incorrect.' };
    case 'email_not_confirmed':
      return { code: 'email_not_confirmed', message: 'Confirm your email before signing in.' };
    case 'user_already_exists':
    case 'email_exists':
      return { code: 'user_already_exists', message: 'An account already exists with that email.' };
    case 'otp_expired':
    case 'otp_disabled':
      return { code: 'invalid_otp', message: 'That code is invalid or expired.' };
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return { code: 'rate_limited', message: 'Too many attempts. Try again in a minute.' };
    default: {
      // No code — fall back to network detection by message.
      const msg = err.message ?? '';
      if (/network|fetch|timeout/i.test(msg)) {
        return { code: 'network', message: 'Network error. Check your connection.' };
      }
      return { code: 'unknown', message: msg || 'Something went wrong.' };
    }
  }
}

// ───── Result shape ──────────────────────────────────────────────────────
export interface AuthResult<T> {
  data: T | null;
  error: AuthError | null;
}

function ok<T>(data: T): AuthResult<T> {
  return { data, error: null };
}

function fail<T>(error: AuthError): AuthResult<T> {
  return { data: null, error };
}

// ───── Operations ────────────────────────────────────────────────────────

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult<{ user: User; session: Session }>> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  // signInWithPassword always returns both on success.
  return ok({ user: data.user!, session: data.session! });
}

/**
 * Sign up with email + password.
 *
 * With Supabase email confirmation enabled (project default), the
 * returned `session` is null — the user must confirm via the code sent
 * to their email before a session is created. Callers should route to
 * the verify screen on success.
 */
export async function signUp(
  email: string,
  password: string,
): Promise<AuthResult<{ user: User; session: Session | null }>> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  return ok({ user: data.user!, session: data.session });
}

/**
 * Request a magic-link OTP. Supabase emails both a clickable link and a
 * 6-digit code. Caller routes to the verify screen and the user enters
 * the code on return.
 *
 * `shouldCreateUser: false` — magic link is for existing accounts only;
 * use signUp() for new accounts.
 */
export async function requestMagicLink(email: string): Promise<AuthResult<true>> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  return ok(true);
}

/**
 * Resend the OTP for whichever flow the user is in the middle of.
 * Used by VerifyScreen's "Resend code" affordance.
 */
export async function resendOtp(
  email: string,
  mode: 'signup' | 'magiclink',
): Promise<AuthResult<true>> {
  if (mode === 'magiclink') return requestMagicLink(email);
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  return ok(true);
}

/**
 * Verify an OTP code. `mode` selects the right Supabase type:
 *   - 'signup'    — code from the signup confirmation email
 *   - 'magiclink' — code from a magic-link sign-in email
 */
export async function verifyOtp(
  email: string,
  token: string,
  mode: 'signup' | 'magiclink',
): Promise<AuthResult<{ user: User; session: Session }>> {
  const type = mode === 'signup' ? 'signup' : 'email';
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type });
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  return ok({ user: data.user!, session: data.session! });
}

export async function signOut(): Promise<AuthResult<true>> {
  const { error } = await supabase.auth.signOut();
  const mapped = mapError(error);
  if (mapped) return fail(mapped);
  return ok(true);
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Subscribe to auth state changes. Returns the Supabase Subscription
 * directly so the caller can `subscription.unsubscribe()` on cleanup.
 */
export function onAuthStateChange(
  handler: (session: Session | null) => void,
): Subscription {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session);
  });
  return data.subscription;
}
