/**
 * OnboardingScreen — Screen
 * First-run "set up your profile" form (PROJECT_SPEC §22 Phase 5.5). Collects
 * name, handicap, dominant hand, skill level, and default camera angle so the
 * profile is pre-populated — most importantly the name, so Home/Profile show
 * it instead of the auto-generated username.
 *
 * Shown by RootNavigator when authenticated && !isOnboarded. On finish it
 * writes the profile (+ MMKV capture defaults / prefs) and calls
 * `markOnboarded`, which flips the gate and swaps this screen for the tabs —
 * no manual navigation. "Skip for now" just marks onboarded.
 *
 * No prototype exists; built in the design system, mirroring AuthScreen.
 */

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input } from '@/components/ui';
import { AngleSegmented, HandSegmented } from '@/components/swing-meta';
import type { CameraAngle, SwingHand } from '@/constants/camera';
import {
  SkillSegmented,
  type SkillLevel,
} from '@/features/onboarding/components/SkillSegmented';
import { markOnboarded } from '@/features/onboarding/onboardingStore';
import { parseHandicap } from '@/features/profile/handicap';
import { useProfile } from '@/features/profile/hooks/useProfile';
import {
  loadDefaultCameraAngle,
  loadDefaultSwingHand,
  setDefaultCameraAngle,
} from '@/utils/captureDefaults';
import { useAppStore } from '@/store/useAppStore';
import { colors, layout, spacing, typography } from '@/theme';

const EDGES: Edge[] = ['top', 'bottom'];

export function OnboardingScreen() {
  const userId = useAppStore(s => s.user?.id ?? null);
  const { updateProfile } = useProfile();

  const [name, setName] = useState('');
  const [handicap, setHandicap] = useState('');
  const [hand, setHand] = useState<SwingHand>(loadDefaultSwingHand);
  const [skill, setSkill] = useState<SkillLevel>('intermediate');
  const [angle, setAngle] = useState<CameraAngle>(loadDefaultCameraAngle);
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = name.trim().length > 0 && !isSaving;

  const finish = () => {
    if (!userId) return;
    // Persist the device-local capture default first, then mark onboarded
    // (which unmounts this screen). Capture mirror for hand is handled by
    // updateProfile; handicap is written to the profile in handleGetStarted.
    setDefaultCameraAngle(angle);
    markOnboarded(userId);
  };

  const handleGetStarted = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    // Only send a handicap when it parses to a valid value; an empty or
    // malformed optional field is simply left unset.
    const parsedHandicap = parseHandicap(handicap);
    const ok = await updateProfile({
      displayName: name.trim(),
      swingHand: hand,
      skillLevel: skill,
      ...(typeof parsedHandicap === 'number' ? { handicap: parsedHandicap } : {}),
    });
    if (!ok) {
      setIsSaving(false); // updateProfile already toasted
      return;
    }
    finish();
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
          <View style={styles.mark} accessible accessibilityLabel="Caddie">
            <Text style={styles.markGlyph}>⛳</Text>
          </View>

          <Text style={styles.heading}>Set up your profile</Text>
          <Text style={styles.subheading}>
            A few details so Caddie can tailor coaching to your game.
          </Text>

          <View style={styles.fields}>
            <Input
              label="Your name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Marcus Reilly"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              editable={!isSaving}
            />
            <Input
              label="Handicap (optional)"
              value={handicap}
              onChangeText={setHandicap}
              placeholder="e.g. 14.2"
              keyboardType="decimal-pad"
              maxLength={4}
              editable={!isSaving}
            />

            <Field label="Dominant hand">
              <HandSegmented value={hand} onChange={setHand} disabled={isSaving} />
            </Field>
            <Field label="Skill level">
              <SkillSegmented value={skill} onChange={setSkill} disabled={isSaving} />
            </Field>
            <Field label="Default camera angle">
              <AngleSegmented value={angle} onChange={setAngle} disabled={isSaving} />
            </Field>
          </View>

          <View style={styles.cta}>
            <Button
              label="Get started"
              onPress={handleGetStarted}
              variant="primary"
              size="lg"
              loading={isSaving}
              disabled={!canSubmit}
              fullWidth
            />
            <View style={styles.skipWrap}>
              <Button
                label="Skip for now"
                onPress={finish}
                variant="ghost"
                size="sm"
                disabled={isSaving}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

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
  fields: {
    marginTop: spacing[6],
    gap: spacing[4],
  },
  field: {
    gap: spacing[2],
  },
  fieldLabel: {
    ...typography.label,
    color: colors.text.secondary,
  },
  cta: {
    marginTop: spacing[6],
  },
  skipWrap: {
    marginTop: spacing[2],
    alignItems: 'center',
  },
});
