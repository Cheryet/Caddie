/**
 * EditNameScreen — Screen
 * Pushed single-field form for the player's display name
 * (Design/Caddie Screens.dc.html § edit sub-pages → "Edit name"). Cancel /
 * Save header, the field focused with the keyboard raised, helper line below.
 *
 * Saves to `profiles.display_name` through useProfile.updateProfile (which
 * handles the optimistic write + error toast). Composition only.
 */

import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { Input, Toast } from '@/components/ui';
import { EditScreenHeader } from '@/features/profile/components/EditScreenHeader';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { colors, layout, spacing } from '@/theme';

import type { RootStackScreenProps } from '@/navigation/types';

const MAX_NAME_LENGTH = 60;

export function EditNameScreen({ navigation }: RootStackScreenProps<'EditName'>) {
  const profile = useProfile();
  const currentName = profile.displayName ?? profile.username ?? '';

  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);

  // Seed once the row has loaded (the hook refetches on mount).
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && !profile.isLoading) {
      setName(profile.displayName ?? profile.username ?? '');
      seeded.current = true;
    }
  }, [profile.isLoading, profile.displayName, profile.username]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== currentName && !isSaving;

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    const ok = await profile.updateProfile({ displayName: trimmed });
    setIsSaving(false);
    // updateProfile toasts on failure; only the success path acts here.
    if (ok) {
      Toast.show({ message: 'Name updated', variant: 'success' });
      navigation.goBack();
    }
  };

  return (
    <View style={styles.root}>
      <EditScreenHeader
        title="Edit name"
        onCancel={navigation.goBack}
        onSave={handleSave}
        saveDisabled={!canSave}
        saving={isSaving}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Input
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={MAX_NAME_LENGTH}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            editable={!isSaving}
            helper="This name appears on every swing you share."
            rightAdornment={
              name.length > 0 ? (
                <Pressable
                  onPress={() => setName('')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear name"
                  style={styles.clear}>
                  <Svg width={10} height={10} viewBox="0 0 24 24" fill="none">
                    <Line
                      x1={6}
                      y1={6}
                      x2={18}
                      y2={18}
                      stroke={colors.bg.base}
                      strokeWidth={3.2}
                      strokeLinecap="round"
                    />
                    <Line
                      x1={18}
                      y1={6}
                      x2={6}
                      y2={18}
                      stroke={colors.bg.base}
                      strokeWidth={3.2}
                      strokeLinecap="round"
                    />
                  </Svg>
                </Pressable>
              ) : null
            }
          />
        </View>
      </KeyboardAvoidingView>
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
  },
  clear: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
