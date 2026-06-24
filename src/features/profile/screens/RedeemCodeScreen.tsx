/**
 * RedeemCodeScreen — Screen
 * Pushed redeem-a-code screen (Design/Caddie Screens.dc.html § edit
 * sub-pages → "Redeem code"): gold ticket mark, intro copy, a monospace code
 * field, an info note, and a single gold Redeem button.
 *
 * Per PROJECT_SPEC §17 Caddie ships no custom coupon backend — the Redeem
 * button hands off to Apple's native offer-code redemption sheet
 * (RevenueCat). Entitlement is refreshed afterwards since a successful
 * redeem flips Pro out-of-band. The native sheet owns the success/error UI,
 * so the prototype's in-app success state isn't reproduced.
 */

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Button, Toast } from '@/components/ui';
import { presentCodeRedemption } from '@/core/revenuecat/client';
import { EditScreenHeader } from '@/features/profile/components/EditScreenHeader';
import { TicketIcon } from '@/features/profile/components/ProfileIcons';
import { useSubscription } from '@/features/subscription/hooks/useSubscription';
import { colors, layout, spacing, typography } from '@/theme';

import type { RootStackScreenProps } from '@/navigation/types';

export function RedeemCodeScreen({
  navigation,
}: RootStackScreenProps<'RedeemCode'>) {
  const { refresh } = useSubscription();
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeem = async () => {
    setIsRedeeming(true);
    const presented = await presentCodeRedemption();
    if (!presented) {
      setIsRedeeming(false);
      Toast.show({
        message: 'Code redemption isn’t available on this device.',
        variant: 'info',
      });
      return;
    }
    // The App Store sheet owns entry + outcome; re-sync entitlement so a
    // successful redeem reflects in Pro status, then close.
    await refresh();
    setIsRedeeming(false);
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <EditScreenHeader title="Redeem code" onCancel={navigation.goBack} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.mark}>
            <TicketIcon size={28} color={colors.gold.default} />
          </View>

          <Text style={styles.title}>Redeem a code</Text>
          <Text style={styles.subtitle}>
            Enter a promo or gift code to add Caddie Pro time or account credit.
            It applies instantly.
          </Text>

          <Text style={styles.label}>Promo or gift code</Text>
          <TextInput
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            placeholder="CADDIE-CODE"
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
            returnKeyType="done"
            onSubmitEditing={handleRedeem}
            editable={!isRedeeming}
            selectionColor={colors.gold.default}
            style={styles.codeInput}
            accessibilityLabel="Promo or gift code"
          />

          <View style={styles.note}>
            <InfoIcon />
            <Text style={styles.noteText}>
              Codes come from Caddie partners and gift purchases. Pro codes
              extend your subscription; credit codes apply at your next renewal.
            </Text>
          </View>

          <Button
            label="Redeem code"
            onPress={handleRedeem}
            variant="primary"
            size="lg"
            loading={isRedeeming}
            fullWidth
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function InfoIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={colors.text.secondary} strokeWidth={2} />
      <Line
        x1={12}
        y1={11}
        x2={12}
        y2={16}
        stroke={colors.text.secondary}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={7.5} r={0.5} fill={colors.text.secondary} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: layout.screenPaddingH + spacing[1],
    paddingTop: spacing[2],
    paddingBottom: spacing[10],
  },
  mark: {
    width: 54,
    height: 54,
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.gold.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.display,
    fontSize: 26,
    marginTop: spacing[4] + 2,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing[2],
  },
  label: {
    ...typography.label,
    marginTop: spacing[5] + 2,
    marginBottom: spacing[2],
  },
  codeInput: {
    height: 58,
    borderRadius: layout.borderRadius.md + 2,
    backgroundColor: colors.bg.input,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[4],
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: 2,
  },
  note: {
    flexDirection: 'row',
    gap: spacing[2] + 1,
    marginTop: spacing[4] + 2,
    marginBottom: spacing[5],
    padding: spacing[3] + 1,
    borderRadius: layout.borderRadius.md + 2,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  noteText: {
    ...typography.caption,
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.text.secondary,
  },
});
