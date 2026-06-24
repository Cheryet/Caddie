/**
 * ChangePasswordScreen — Screen
 * Pushed three-field form (Design/Caddie Screens.dc.html § edit sub-pages →
 * "Change password"): current password, new password with a live strength
 * meter + requirement checklist, and confirm. Cancel / Save header.
 *
 * Save re-verifies the current password then writes the new one via
 * useAuth.changePassword. Problems surface inline (wrong current password on
 * its field, mismatch under confirm) — never an alert (DESIGN_SYSTEM §5).
 */

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Input, Toast } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { EditScreenHeader } from '@/features/profile/components/EditScreenHeader';
import { EyeIcon, EyeOffIcon } from '@/features/profile/components/ProfileIcons';
import {
  evaluatePassword,
  type PasswordCheck,
  type PasswordStrength,
} from '@/features/profile/passwordRules';
import { colors, layout, spacing, typography } from '@/theme';

import type { RootStackScreenProps } from '@/navigation/types';

export function ChangePasswordScreen({
  navigation,
}: RootStackScreenProps<'ChangePassword'>) {
  const { changePassword } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const strength = evaluatePassword(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSave =
    current.length > 0 && strength.allMet && next === confirm && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setCurrentError(null);
    const err = await changePassword(current, next);
    setIsSaving(false);
    if (!err) {
      Toast.show({ message: 'Password changed', variant: 'success' });
      navigation.goBack();
      return;
    }
    if (err.code === 'invalid_credentials') {
      setCurrentError(err.message);
    } else {
      Toast.show({ message: err.message, variant: 'error' });
    }
  };

  return (
    <View style={styles.root}>
      <EditScreenHeader
        title="Change password"
        onCancel={navigation.goBack}
        onSave={handleSave}
        saveDisabled={!canSave}
        saving={isSaving}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Input
            label="Current password"
            value={current}
            onChangeText={t => {
              setCurrent(t);
              if (currentError) setCurrentError(null);
            }}
            placeholder="Enter current password"
            secureTextEntry={!showCurrent}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            editable={!isSaving}
            error={currentError ?? undefined}
            rightAdornment={
              <EyeToggle visible={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
            }
          />

          <View>
            <Input
              label="New password"
              value={next}
              onChangeText={setNext}
              placeholder="Create a new password"
              secureTextEntry={!showNext}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!isSaving}
              rightAdornment={
                <EyeToggle visible={showNext} onToggle={() => setShowNext(v => !v)} />
              }
            />
            <StrengthMeter strength={strength} />
            <View style={styles.reqs}>
              {strength.checks.map(check => (
                <Requirement key={check.label} check={check} />
              ))}
            </View>
          </View>

          <Input
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter new password"
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            editable={!isSaving}
            error={mismatch ? 'Passwords do not match.' : undefined}
            rightAdornment={
              <EyeToggle visible={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ───── Subcomponents ────────────────────────────────────────────────────────

function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      style={styles.eye}>
      {visible ? <EyeOffIcon /> : <EyeIcon />}
    </Pressable>
  );
}

function StrengthMeter({ strength }: { strength: PasswordStrength }) {
  const toneColor =
    strength.tone === 'success'
      ? colors.semantic.success
      : strength.tone === 'warning'
        ? colors.semantic.warning
        : colors.text.tertiary;
  return (
    <View style={styles.strengthRow}>
      <View style={styles.bars}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={[
              styles.bar,
              { backgroundColor: i < strength.score ? toneColor : colors.border.default },
            ]}
          />
        ))}
      </View>
      {strength.label ? (
        <Text style={[styles.strengthLabel, { color: toneColor }]}>{strength.label}</Text>
      ) : null}
    </View>
  );
}

function Requirement({ check }: { check: PasswordCheck }) {
  return (
    <View style={styles.reqRow}>
      {check.met ? (
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
          <Polyline
            points="4 12 10 18 20 6"
            stroke={colors.semantic.success}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : (
        <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={8.5} stroke={colors.text.tertiary} strokeWidth={2.2} />
        </Svg>
      )}
      <Text
        style={[
          styles.reqLabel,
          { color: check.met ? colors.text.secondary : colors.text.tertiary },
        ]}>
        {check.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  eye: {
    paddingHorizontal: spacing[1],
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing[1],
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  reqs: {
    gap: spacing[1] + 3,
    marginTop: spacing[3],
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  reqLabel: {
    ...typography.label,
    fontSize: 12.5,
  },
});
