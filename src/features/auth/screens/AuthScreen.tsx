/**
 * AuthScreen — Screen
 * Combined sign-in / create-account entry point. A segmented control
 * toggles mode; the same email + password fields drive both flows. A
 * subtle "email me a code" affordance triggers the magic-link path
 * (sign-in mode only). Apple/Google buttons are rendered as disabled
 * "Coming soon" placeholders — see PROJECT_SPEC.md §4 (social auth is
 * out of MVP scope; Apple is required by App Store guideline 4.8 once
 * any third-party social auth ships, so they will land together).
 *
 * Visual values match Design/Caddie Auth.dc.html (Frame 2). The screen
 * composes design-system primitives (Button, Input) for the field stack
 * and CTA; the segmented control and social placeholders remain local
 * subcomponents — they're screen-specific patterns, not shared
 * primitives.
 */

import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { colors, layout, spacing, typography } from '@/theme';

import type { AuthStackScreenProps } from '@/navigation/types';

type Mode = 'signin' | 'signup';

const EDGES: Edge[] = ['top', 'bottom'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Magic-link sign-in is wired but the affordance is hidden until we have
// custom SMTP + a code-first magic-link email template. See TODO.md.
const MAGIC_LINK_ENABLED = false;

export function AuthScreen({ navigation }: AuthStackScreenProps<'Auth'>) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    signIn,
    signUp,
    requestMagicLink,
    isSubmitting,
    error,
    clearError,
  } = useAuth();

  // Clear any lingering error when the user changes mode or edits a field.
  useEffect(() => {
    clearError();
  }, [mode, clearError]);

  const isSignup = mode === 'signup';
  const isEmailValid = EMAIL_RE.test(email.trim());
  const isPasswordValid = password.length >= 8;
  const canSubmit = isEmailValid && isPasswordValid && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (isSignup) {
      const result = await signUp(email.trim(), password);
      if (result?.needsVerification) {
        navigation.navigate('Verify', { email: email.trim(), mode: 'signup' });
      }
      // Otherwise the global auth listener picks up the new session and
      // RootNavigator swaps to the app stack automatically.
    } else {
      await signIn(email.trim(), password);
    }
  };

  const handleMagicLink = async () => {
    if (!isEmailValid || isSubmitting) return;
    const ok = await requestMagicLink(email.trim());
    if (ok) {
      navigation.navigate('Verify', { email: email.trim(), mode: 'magiclink' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={EDGES}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Brand mark */}
          <View style={styles.mark} accessible accessibilityLabel="Caddie">
            <Text style={styles.markGlyph}>⛳</Text>
          </View>

          {/* Heading */}
          <Text style={styles.heading}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </Text>
          <Text style={styles.subheading}>
            {isSignup
              ? 'Start logging swings and get AI coaching from your first session.'
              : 'Pick up right where you left off on the range.'}
          </Text>

          {/* Segmented control */}
          <View style={styles.segment} accessibilityRole="tablist">
            <SegmentButton
              label="Sign in"
              active={!isSignup}
              onPress={() => setMode('signin')}
            />
            <SegmentButton
              label="Create account"
              active={isSignup}
              onPress={() => setMode('signup')}
            />
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              returnKeyType="next"
              editable={!isSubmitting}
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder={isSignup ? 'Create a password' : 'Enter your password'}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              textContentType={isSignup ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              editable={!isSubmitting}
              helper={isSignup ? 'At least 8 characters.' : undefined}
              rightAdornment={
                <Pressable
                  onPress={() => setShowPassword(p => !p)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }>
                  <Text style={styles.adornmentLabel}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              }
            />
          </View>

          {/* Inline error — Toast would be wrong here (auth errors need
              persistence until the user retries). */}
          {error ? (
            <View
              style={styles.errorBox}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert">
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          ) : null}

          {/* Primary CTA */}
          <View style={styles.cta}>
            <Button
              label={isSignup ? 'Create account' : 'Sign in'}
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              loading={isSubmitting}
              disabled={!canSubmit}
              fullWidth
            />
          </View>

          {/* Magic link (sign-in only) — hidden until SMTP/template ready (TODO.md) */}
          {MAGIC_LINK_ENABLED && !isSignup ? (
            <View style={styles.magicLink}>
              <Button
                label="Email me a sign-in code instead"
                onPress={handleMagicLink}
                variant="ghost"
                size="sm"
                disabled={!isEmailValid || isSubmitting}
              />
            </View>
          ) : null}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social placeholders — disabled, see PROJECT_SPEC.md §4 */}
          <View style={styles.socialRow}>
            <SocialPlaceholder label="Apple" />
            <SocialPlaceholder label="Google" />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {isSignup ? (
              <Text style={styles.footerText}>
                By creating an account you agree to our{' '}
                <Text style={styles.footerEmphasis}>Terms</Text> and{' '}
                <Text style={styles.footerEmphasis}>Privacy Policy</Text>.
              </Text>
            ) : (
              <Text style={styles.footerText}>
                New to Caddie?{' '}
                <Text
                  style={styles.footerLink}
                  onPress={() => setMode('signup')}
                  accessibilityRole="link">
                  Create an account
                </Text>
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ───── Subcomponents (local — not shared design-system primitives) ───────

interface SegmentButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function SegmentButton({ label, active, onPress }: SegmentButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}>
      <Text
        style={[
          styles.segmentLabel,
          active && styles.segmentLabelActive,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function SocialPlaceholder({ label }: { label: string }) {
  return (
    <View
      style={styles.socialButton}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      accessibilityLabel={`${label} sign in — coming soon`}>
      <Text style={styles.socialLabel}>{label}</Text>
      <Text style={styles.socialBadge}>Coming soon</Text>
    </View>
  );
}

// ───── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: layout.screenPaddingH + spacing[2],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
  },
  mark: {
    width: 46,
    height: 46,
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.gold.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGlyph: {
    fontSize: 24,
  },
  heading: {
    ...typography.display,
    fontSize: 28,
    marginTop: spacing[5],
  },
  subheading: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  segment: {
    marginTop: spacing[5],
    flexDirection: 'row',
    gap: spacing[1],
    padding: spacing[1],
    backgroundColor: colors.bg.elevated,
    borderWidth: spacing.px,
    borderColor: colors.border.subtle,
    borderRadius: layout.borderRadius.md + 3,
  },
  segmentButton: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.borderRadius.md,
  },
  segmentButtonActive: {
    backgroundColor: colors.bg.overlay,
  },
  segmentLabel: {
    ...typography.labelStrong,
    fontSize: 14,
    color: colors.text.secondary,
  },
  segmentLabelActive: {
    color: colors.text.primary,
  },
  fields: {
    marginTop: spacing[5],
    gap: spacing[4],
  },
  adornmentLabel: {
    ...typography.labelStrong,
    color: colors.text.secondary,
    paddingHorizontal: spacing[2],
  },
  errorBox: {
    marginTop: spacing[4],
    padding: spacing[3],
    borderRadius: layout.borderRadius.md,
    backgroundColor: 'rgba(201, 74, 74, 0.10)',
    borderWidth: spacing.px,
    borderColor: 'rgba(201, 74, 74, 0.35)',
  },
  errorText: {
    ...typography.label,
    color: colors.semantic.error,
  },
  cta: {
    marginTop: spacing[5],
  },
  magicLink: {
    marginTop: spacing[2],
    alignItems: 'center',
  },
  divider: {
    marginTop: spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: spacing.px,
    backgroundColor: colors.border.subtle,
  },
  dividerLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  socialRow: {
    marginTop: spacing[4],
    flexDirection: 'row',
    gap: spacing[3],
  },
  socialButton: {
    flex: 1,
    height: 50,
    borderRadius: layout.borderRadius.md + 3,
    backgroundColor: colors.bg.elevated,
    borderWidth: spacing.px,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    opacity: 0.55,
  },
  socialLabel: {
    ...typography.labelStrong,
    color: colors.text.primary,
  },
  socialBadge: {
    ...typography.caption,
    color: colors.text.tertiary,
    letterSpacing: 0.4,
  },
  footer: {
    marginTop: spacing[6],
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerEmphasis: {
    color: colors.text.secondary,
  },
  footerLink: {
    ...typography.labelStrong,
    color: colors.text.primary,
  },
});
