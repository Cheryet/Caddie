/**
 * EditScreenHeader — Feature component
 * The pushed-form nav header shared by the profile edit sub-pages
 * (Design/Caddie Screens.dc.html § edit sub-pages): a neutral Cancel on the
 * left, the screen title centred, and the screen's single gold Save on the
 * right. Screens with no save action (Redeem code) omit `onSave` and a
 * spacer keeps the title centred.
 *
 * Sits below the status bar via the top safe-area inset. Presentational —
 * the screen owns the handlers and the disabled/saving state.
 *
 * Used by: EditNameScreen, ChangePasswordScreen, RedeemCodeScreen.
 */

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, typography } from '@/theme';

interface EditScreenHeaderProps {
  title: string;
  onCancel: () => void;
  /** Omit for screens with no save action (a spacer keeps the title centred). */
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  /** Swaps the Save label for a spinner while the write is in flight. */
  saving?: boolean;
}

export function EditScreenHeader({
  title,
  onCancel,
  onSave,
  saveLabel = 'Save',
  saveDisabled = false,
  saving = false,
}: EditScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {/* Centred title sits behind the buttons and never intercepts taps. */}
        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <Pressable
          onPress={onCancel}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={styles.button}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>

        {onSave ? (
          <Pressable
            onPress={onSave}
            disabled={saveDisabled || saving}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={saveLabel}
            accessibilityState={{ disabled: saveDisabled || saving }}
            style={styles.button}>
            {saving ? (
              <ActivityIndicator color={colors.gold.default} />
            ) : (
              <Text style={[styles.save, saveDisabled && styles.saveDisabled]}>
                {saveLabel}
              </Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.bg.base,
  },
  bar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPaddingH,
  },
  titleWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title3,
    fontSize: 17,
    letterSpacing: -0.2,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cancel: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  save: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gold.default,
  },
  saveDisabled: {
    color: colors.text.tertiary,
  },
  spacer: {
    width: 48,
  },
});
