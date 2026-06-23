/**
 * UpgradeSheet — Feature component (global singleton)
 * The Pro paywall. Opened from anywhere via the imperative singleton —
 * `UpgradeSheet.show()` — exactly like Toast; `<UpgradeSheetHost />` is
 * mounted once in App.tsx and renders the active sheet. ProGate's "Upgrade
 * to Pro" CTA triggers it (PROJECT_SPEC §17).
 *
 * The sheet shows the monthly + annual plans with annual highlighted; tapping
 * a plan purchases it (RevenueCat), and on success `isPro` flips → every
 * ProGate re-renders and delivers its feature. "Restore purchases" lives here
 * too (the SettingsScreen entry lands with Phase 5.4 — see TODO.md).
 *
 * No dedicated design mock exists for this sheet — it's built on-brand from
 * §17 + the design system; visual polish can follow.
 *
 * Part of: src/features/subscription/
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polyline } from 'react-native-svg';

// Direct imports (not the @/components/ui barrel): ProGate triggers this
// sheet, and the barrel re-exports ProGate — importing leaf components keeps
// the dependency graph acyclic.
import { Badge } from '@/components/ui/Badge';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useUpgrade } from '@/features/subscription/hooks/useUpgrade';
import type { ProPackage } from '@/core/revenuecat/client';
import { colors, layout, spacing, typography } from '@/theme';

const FEATURES = [
  'Unlimited AI swing breakdowns',
  'A matched drill for every fault',
  'Side-by-side swing comparison',
] as const;

// ───── Singleton ───────────────────────────────────────────────────────────
// Lives outside React so any handler (a ProGate press, a deep link later) can
// open the paywall without prop-drilling.

type Listener = (open: boolean) => void;

let isOpen = false;
const listeners = new Set<Listener>();

function emit(open: boolean): void {
  isOpen = open;
  listeners.forEach(l => l(open));
}

export const UpgradeSheet = {
  show(): void {
    emit(true);
  },
  hide(): void {
    emit(false);
  },
};

// ───── Host ────────────────────────────────────────────────────────────────

export function UpgradeSheetHost(): React.ReactElement {
  const [open, setOpen] = useState(isOpen);

  useEffect(() => {
    const listener: Listener = setOpen;
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return <UpgradeSheetView visible={open} onDismiss={UpgradeSheet.hide} />;
}

// ───── View ────────────────────────────────────────────────────────────────

interface UpgradeSheetViewProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * The paywall UI. Normally driven by the global host above, but exported
 * so a screen presented as a native-stack *modal* (e.g. PlaybackScreen)
 * can host its own instance: the App-root host's RN Modal can't present
 * over a native modal VC, so such screens render this directly to appear
 * on top of themselves.
 */
export function UpgradeSheetView({ visible, onDismiss }: UpgradeSheetViewProps) {
  const { status, packages, purchase, restore } = useUpgrade({
    enabled: visible,
    onClose: onDismiss,
  });

  const monthly = packages.find(p => p.period === 'monthly');
  const annual = packages.find(p => p.period === 'annual');
  const busy = status === 'purchasing' || status === 'restoring';

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      accessibilityLabel="Upgrade to Caddie Pro">
      <View style={styles.content}>
        <View style={styles.crownTile}>
          <CrownIcon />
        </View>
        <Text style={styles.title}>Caddie Pro</Text>
        <Text style={styles.subtitle}>
          Unlimited AI breakdowns, a drill for every fault, and side-by-side
          comparison.
        </Text>

        <View style={styles.features}>
          {FEATURES.map(feature => (
            <View key={feature} style={styles.featureRow}>
              <CheckIcon />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {status === 'loading' ? (
          <ActivityIndicator color={colors.gold.default} style={styles.loader} />
        ) : status === 'unavailable' ? (
          <Text style={styles.unavailable}>
            Plans are unavailable right now. Please try again in a moment.
          </Text>
        ) : (
          <View style={styles.plans}>
            {annual ? (
              <PlanRow
                pkg={annual}
                highlighted
                disabled={busy}
                onPress={() => purchase('annual')}
              />
            ) : null}
            {monthly ? (
              <PlanRow
                pkg={monthly}
                disabled={busy}
                onPress={() => purchase('monthly')}
              />
            ) : null}
            {status === 'purchasing' ? (
              <Text style={styles.purchasing}>Completing your purchase…</Text>
            ) : null}
          </View>
        )}

        <Button
          label="Restore purchases"
          variant="ghost"
          onPress={restore}
          loading={status === 'restoring'}
          disabled={status === 'purchasing'}
        />
        <Text style={styles.terms}>
          Recurring billing · cancel anytime in Settings.
        </Text>
      </View>
    </BottomSheet>
  );
}

// ───── Plan row ──────────────────────────────────────────────────────────

interface PlanRowProps {
  pkg: ProPackage;
  highlighted?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function PlanRow({ pkg, highlighted = false, disabled = false, onPress }: PlanRowProps) {
  const isAnnual = pkg.period === 'annual';
  const label = isAnnual ? 'Annual' : 'Monthly';
  const billing = isAnnual ? 'Billed yearly' : 'Billed monthly';
  const suffix = isAnnual ? '/yr' : '/mo';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} plan, ${pkg.priceString}`}
      style={[
        styles.plan,
        highlighted && styles.planHighlighted,
        disabled && styles.planDisabled,
      ]}>
      <View style={styles.planInfo}>
        <View style={styles.planLabelRow}>
          <Text style={styles.planLabel}>{label}</Text>
          {highlighted ? <Badge label="Best value" variant="gold" size="sm" /> : null}
        </View>
        <Text style={styles.planBilling}>{billing}</Text>
      </View>
      <View style={styles.planPriceCol}>
        <Text style={styles.planPrice}>{pkg.priceString}</Text>
        <Text style={styles.planSuffix}>{suffix}</Text>
      </View>
    </Pressable>
  );
}

// ───── Icons (verbatim from design §15 Pro visual language) ────────────────

function CrownIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill={colors.gold.default}>
      <Path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-1.6 10.5H4.6z" />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="4 12 10 18 20 6"
        stroke={colors.gold.default}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  crownTile: {
    width: 48,
    height: 48,
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.gold.dim,
    borderWidth: 1,
    borderColor: colors.gold.muted,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing[3],
  },
  title: {
    ...typography.title1,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[2],
    paddingHorizontal: spacing[4],
  },
  features: {
    gap: spacing[2] + 2,
    marginTop: spacing[5],
    marginBottom: spacing[5],
    paddingHorizontal: spacing[2],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  featureText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.primary,
  },
  loader: {
    marginVertical: spacing[8],
  },
  unavailable: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginVertical: spacing[6],
    paddingHorizontal: spacing[4],
  },
  plans: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  planHighlighted: {
    borderColor: colors.gold.muted,
    backgroundColor: colors.gold.dim,
  },
  planDisabled: {
    opacity: 0.5,
  },
  planInfo: {
    flex: 1,
    gap: spacing[1],
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  planLabel: {
    ...typography.title3,
  },
  planBilling: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  planPriceCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  planPrice: {
    ...typography.title3,
    color: colors.text.primary,
  },
  planSuffix: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  purchasing: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing[1],
  },
  terms: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing[2],
  },
});
