/**
 * useAuth — Feature hook
 * Orchestrates email/password and magic-link auth. Owns transient UI
 * state (isSubmitting, error) and writes the resulting user into the
 * Zustand global store on success. Errors are surfaced via the returned
 * `error` object — the caller decides how to render (inline message,
 * Toast, etc.).
 *
 * Source of truth for the store mutation is *not* this hook — the
 * onAuthStateChange subscription set up by useAuthBootstrap updates
 * `user` for every event. We still call setUser here for the optimistic
 * snap so the navigator switches without waiting for the next tick.
 *
 * Used by: AuthScreen, VerifyScreen, ProfileScreen (sign out only).
 */

import { useCallback, useState } from 'react';

import * as authService from '@/core/supabase/auth';
import type { AuthError } from '@/core/supabase/auth';
import { useAppStore } from '@/store/useAppStore';

type VerifyMode = 'signup' | 'magiclink';

interface SignUpResult {
  /**
   * True when Supabase requires the user to confirm via emailed code
   * before a session is issued. The caller should navigate to the
   * verify screen.
   */
  needsVerification: boolean;
}

interface UseAuthReturn {
  isSubmitting: boolean;
  error: AuthError | null;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<SignUpResult | null>;
  requestMagicLink: (email: string) => Promise<boolean>;
  verifyMagicCode: (email: string, code: string, mode: VerifyMode) => Promise<boolean>;
  resendCode: (email: string, mode: VerifyMode) => Promise<boolean>;
  /**
   * Change the signed-in user's password. Re-verifies `currentPassword`
   * first (updateUser alone doesn't), then sets the new one. Resolves to
   * `null` on success or the mapped AuthError on failure — a
   * `invalid_credentials` code means the current password was wrong, which
   * the screen surfaces inline on that field.
   */
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthError | null>;
  signOut: () => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const setUser = useAppStore(s => s.setUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      const { data, error: err } = await authService.signInWithPassword(email, password);
      setIsSubmitting(false);
      if (err) {
        setError(err);
        return false;
      }
      setUser(data!.user);
      return true;
    },
    [setUser],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<SignUpResult | null> => {
      setIsSubmitting(true);
      setError(null);
      const { data, error: err } = await authService.signUp(email, password);
      setIsSubmitting(false);
      if (err) {
        setError(err);
        return null;
      }
      // With email-confirm on (project default), session is null until
      // the user verifies. With it off, signUp returns a session and we
      // can skip the verify screen entirely.
      if (data!.session) {
        setUser(data!.user);
        return { needsVerification: false };
      }
      return { needsVerification: true };
    },
    [setUser],
  );

  const requestMagicLink = useCallback(async (email: string): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    const { error: err } = await authService.requestMagicLink(email);
    setIsSubmitting(false);
    if (err) {
      setError(err);
      return false;
    }
    return true;
  }, []);

  const verifyMagicCode = useCallback(
    async (email: string, code: string, mode: VerifyMode): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      const { data, error: err } = await authService.verifyOtp(email, code, mode);
      setIsSubmitting(false);
      if (err) {
        setError(err);
        return false;
      }
      setUser(data!.user);
      return true;
    },
    [setUser],
  );

  const resendCode = useCallback(
    async (email: string, mode: VerifyMode): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      const { error: err } = await authService.resendOtp(email, mode);
      setIsSubmitting(false);
      if (err) {
        setError(err);
        return false;
      }
      return true;
    },
    [],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<AuthError | null> => {
      // Read email imperatively so changePassword isn't re-created on every
      // user change and we don't need it as a dependency.
      const email = useAppStore.getState().user?.email;
      if (!email) {
        const err: AuthError = { code: 'unknown', message: "You're not signed in." };
        setError(err);
        return err;
      }

      setIsSubmitting(true);
      setError(null);

      // Verify the current password by re-authenticating the same user.
      const verify = await authService.signInWithPassword(email, currentPassword);
      if (verify.error) {
        setIsSubmitting(false);
        const err: AuthError =
          verify.error.code === 'invalid_credentials'
            ? { code: 'invalid_credentials', message: 'Current password is incorrect.' }
            : verify.error;
        setError(err);
        return err;
      }

      const updated = await authService.updatePassword(newPassword);
      setIsSubmitting(false);
      if (updated.error) {
        setError(updated.error);
        return updated.error;
      }
      return null;
    },
    [],
  );

  const signOut = useCallback(async (): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    const { error: err } = await authService.signOut();
    setIsSubmitting(false);
    if (err) {
      setError(err);
      return false;
    }
    setUser(null);
    return true;
  }, [setUser]);

  return {
    isSubmitting,
    error,
    clearError,
    signIn,
    signUp,
    requestMagicLink,
    verifyMagicCode,
    resendCode,
    changePassword,
    signOut,
  };
}
