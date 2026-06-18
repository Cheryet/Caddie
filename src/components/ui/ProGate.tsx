/**
 * ProGate — UI primitive
 * The ONLY way to gate Pro features in the app. Wrap (or replace) gated
 * content with this component — never write inline "if (!isPro) return
 * <UpgradePrompt />" logic. One ProGate, one design, one upgrade flow.
 *
 * Two usage shapes are supported:
 *   <ProGate feature="AI Coaching" />                  // screen-level replacement
 *   <ProGate feature="AI Coaching"><Pro /></ProGate>   // inline wrapper
 *
 * When `isPro` is true the component renders `children` (or null) through
 * with no visual chrome — it's transparent to Pro users.
 *
 * Spec: PROJECT_SPEC.md §17 — value + crown icon + gold border, "Upgrade
 * to Pro" CTA that opens the UpgradeSheet (Phase 4.5).
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSubscription } from '@/features/subscription/hooks/useSubscription';
import { UpgradeSheet } from '@/features/subscription/components/UpgradeSheet';
import { colors, layout, spacing, typography } from '@/theme';

interface ProGateProps {
  /** Human-readable feature name shown in the gate body. */
  feature: string;
  /** Content rendered when the user has Pro. Optional — omit when using
   *  ProGate as a screen-level replacement. */
  children?: ReactNode;
}

export function ProGate({ feature, children }: ProGateProps) {
  const { isPro } = useSubscription();

  if (isPro) {
    return <>{children}</>;
  }

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.crown} accessibilityLabel="Pro">
        ♛
      </Text>
      <Text style={styles.feature}>{feature}</Text>
      <Text style={styles.body}>
        Unlock {feature} with Caddie Pro. Subscribe to access this feature
        and the full Pro library.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        onPress={handleUpgradePress}
        accessibilityRole="button">
        <Text style={styles.ctaLabel}>Upgrade to Pro</Text>
      </Pressable>
    </View>
  );
}

// Opens the global paywall (Phase 4.5). The singleton lives outside React
// so the gate stays a pure presentational primitive — it just triggers.
function handleUpgradePress(): void {
  UpgradeSheet.show();
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.elevated,
    borderColor: colors.gold.default,
    borderWidth: 1,
    borderRadius: layout.borderRadius.lg,
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
  },
  crown: {
    fontSize: 28,
    color: colors.gold.default,
    marginBottom: spacing[1],
  },
  feature: {
    ...typography.title2,
    color: colors.gold.text,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing[4],
    backgroundColor: colors.gold.default,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
    borderRadius: layout.borderRadius.md,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    backgroundColor: colors.gold.bright,
  },
  ctaLabel: {
    ...typography.labelStrong,
    color: colors.text.inverse,
  },
});
