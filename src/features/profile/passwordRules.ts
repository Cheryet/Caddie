/**
 * passwordRules — Pure helpers
 * Live validation for ChangePasswordScreen. The design (Change password,
 * Caddie Screens.dc.html § edit sub-pages) surfaces a 3-segment strength
 * meter and a requirement checklist inline so problems show before Save —
 * never an alert (DESIGN_SYSTEM §5).
 *
 * `allMet` is the Save precondition for the new password; the screen also
 * requires the confirm field to match.
 *
 * Used by: ChangePasswordScreen (+ unit tests).
 */

export const MIN_PASSWORD_LENGTH = 8;

export type StrengthLabel = '' | 'Weak' | 'Good' | 'Strong';
export type StrengthTone = 'none' | 'warning' | 'success';

export interface PasswordCheck {
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  /** 0–3 — how many requirement checks pass; drives the filled-bar count. */
  score: number;
  label: StrengthLabel;
  /** Colour family for the meter + label (maps to semantic tokens). */
  tone: StrengthTone;
  checks: PasswordCheck[];
  /** True only when every requirement is met. */
  allMet: boolean;
}

export function evaluatePassword(password: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    {
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    { label: 'One number', met: /\d/.test(password) },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
  ];

  const score = checks.reduce((n, c) => (c.met ? n + 1 : n), 0);
  const allMet = score === checks.length;

  if (password.length === 0) {
    return { score: 0, label: '', tone: 'none', checks, allMet: false };
  }

  // <=1 reads as Weak (amber); 2 as Good and 3 as Strong (both green) —
  // mirrors the design's 2-bar "Good" example shown in green.
  const label: StrengthLabel = score <= 1 ? 'Weak' : score === 2 ? 'Good' : 'Strong';
  const tone: StrengthTone = score <= 1 ? 'warning' : 'success';

  return { score, label, tone, checks, allMet };
}
