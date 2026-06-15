/**
 * VerifyScreen — Screen
 * OTP code entry. Reached from AuthScreen after either signup or a
 * magic-link request. The `mode` route param selects which Supabase
 * verify type to use; the rest of the screen is identical between the
 * two flows.
 *
 * On success the global auth listener writes the new user into Zustand
 * and RootNavigator swaps to the app stack — this screen unmounts
 * itself by virtue of the stack swap.
 *
 * Visual reference: Design/Caddie Auth.dc.html (Frame 3), adapted from
 * "waiting for a tap" to "enter your code".
 */

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { colors, layout, spacing, typography } from '@/theme';

import type { AuthStackScreenProps } from '@/navigation/types';

const CODE_LENGTH = 6;
const EDGES: Edge[] = ['top', 'bottom'];
const RESEND_COOLDOWN_SEC = 30;

export function VerifyScreen({
  navigation,
  route,
}: AuthStackScreenProps<'Verify'>) {
  const { email, mode } = route.params;
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SEC);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const {
    verifyMagicCode,
    resendCode,
    isSubmitting,
    error,
    clearError,
  } = useAuth();

  // Resend cooldown countdown — Supabase rate-limits repeated sends.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    clearError();
  }, [code, clearError]);

  const canSubmit = code.length === CODE_LENGTH && !isSubmitting;
  const canResend = resendIn <= 0 && !isSubmitting;

  const handleVerify = async () => {
    if (!canSubmit) return;
    await verifyMagicCode(email, code, mode);
    // Success → onAuthStateChange swaps the navigator. No-op here.
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendNotice(null);
    const ok = await resendCode(email, mode);
    if (ok) {
      setResendIn(RESEND_COOLDOWN_SEC);
      setResendNotice('We sent a new code.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={EDGES}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back">
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.envelope}>
            <Text style={styles.envelopeGlyph}>✉️</Text>
          </View>

          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>
            We sent a 6-digit code to{' '}
            <Text style={styles.bodyEmphasis}>{email}</Text>. Enter it below to{' '}
            {mode === 'signup' ? 'finish setting up your account.' : 'sign in.'}
          </Text>

          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={text =>
              setCode(text.replace(/\D/g, '').slice(0, CODE_LENGTH))
            }
            placeholder="000000"
            placeholderTextColor={colors.text.tertiary}
            keyboardType="number-pad"
            inputMode="numeric"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            returnKeyType="go"
            onSubmitEditing={handleVerify}
            editable={!isSubmitting}
            accessibilityLabel="Six digit verification code"
          />

          {error ? (
            <View
              style={styles.errorBox}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert">
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          ) : resendNotice ? (
            <View style={styles.noticeBox} accessibilityLiveRegion="polite">
              <Text style={styles.noticeText}>{resendNotice}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handleVerify}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              !canSubmit && styles.primaryButtonDisabled,
              pressed && canSubmit && styles.primaryButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}>
            {isSubmitting ? (
              <ActivityIndicator color={colors.text.inverse} />
            ) : (
              <Text style={styles.primaryButtonLabel}>Verify</Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleResend}
            disabled={!canResend}
            hitSlop={8}
            style={styles.resend}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canResend }}>
            <Text style={styles.resendLabel}>
              {resendIn > 0
                ? `Resend code in ${resendIn}s`
                : 'Resend code'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: layout.screenPaddingH + spacing[2],
    paddingTop: spacing[2],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.md + 2,
    backgroundColor: colors.bg.elevated,
    borderWidth: spacing.px,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    color: colors.text.primary,
    fontSize: 22,
    lineHeight: 22,
    marginTop: -2,
  },
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingH + spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelope: {
    width: 84,
    height: 84,
    borderRadius: layout.borderRadius.xl + 4,
    backgroundColor: colors.bg.elevated,
    borderWidth: spacing.px,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeGlyph: {
    fontSize: 38,
  },
  title: {
    ...typography.display,
    fontSize: 26,
    marginTop: spacing[6],
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing[2],
    textAlign: 'center',
    maxWidth: 320,
  },
  bodyEmphasis: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  codeInput: {
    marginTop: spacing[6],
    height: 60,
    width: 240,
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.bg.input,
    borderWidth: spacing.px,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[4],
    color: colors.text.primary,
    fontSize: 28,
    fontFamily: 'Courier New',
    fontWeight: '600',
    letterSpacing: 8,
    textAlign: 'center',
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
  noticeBox: {
    marginTop: spacing[4],
    padding: spacing[3],
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.bg.elevated,
    borderWidth: spacing.px,
    borderColor: colors.border.subtle,
  },
  noticeText: {
    ...typography.label,
    color: colors.text.primary,
  },
  footer: {
    paddingHorizontal: layout.screenPaddingH + spacing[2],
    paddingBottom: spacing[6],
    gap: spacing[3],
  },
  primaryButton: {
    height: 54,
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.gold.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonPressed: {
    backgroundColor: colors.gold.bright,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonLabel: {
    ...typography.bodyStrong,
    color: colors.text.inverse,
    fontSize: 16,
  },
  resend: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  resendLabel: {
    ...typography.labelStrong,
    color: colors.text.secondary,
  },
});
