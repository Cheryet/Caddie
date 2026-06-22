/**
 * SignOutSheet — Feature component
 * Sign-out confirmation as a BottomSheet (Design §06, L1616 — "no Alert").
 * Destructive "Sign out" + secondary "Stay signed in" (the safe default).
 * Modeled on library/components/DeleteConfirmSheet.tsx.
 *
 * Presentational; the screen owns `useAuth().signOut()`. Part of:
 * src/features/profile/
 */

import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

interface SignOutSheetProps {
  visible: boolean;
  isSigningOut: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function SignOutSheet({
  visible,
  isSigningOut,
  onConfirm,
  onDismiss,
}: SignOutSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      accessibilityLabel="Sign out confirmation">
      <View style={styles.header}>
        <Text style={styles.title}>Sign out?</Text>
        <Text style={styles.subtitle}>
          You'll need to sign in again to record and analyse swings.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Sign out"
          onPress={onConfirm}
          variant="destructive"
          size="lg"
          loading={isSigningOut}
          disabled={isSigningOut}
          fullWidth
        />
        <View style={styles.stayWrap}>
          <Button
            label="Stay signed in"
            onPress={onDismiss}
            variant="secondary"
            size="lg"
            disabled={isSigningOut}
            fullWidth
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing[1],
    paddingBottom: spacing[4],
  },
  title: {
    ...typography.title1,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing[1],
  },
  actions: {
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  stayWrap: {
    marginTop: spacing[2],
  },
});
