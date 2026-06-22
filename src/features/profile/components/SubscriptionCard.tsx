/**
 * SubscriptionCard — Feature component
 * The subscription zone on ProfileScreen (Design §06, L1033–1044) — the
 * screen's gold accent. Pro: crown + "Caddie Pro" + Pro badge + "Manage
 * subscription". Free: an upgrade card → the one upgrade flow (UpgradeSheet).
 *
 * Presentational; the screen passes `onManage` / `onUpgrade`. Reuses `Badge`
 * and `Button` (secondary = dark fill + gold border for Manage; primary =
 * gold for Upgrade). Part of: src/features/profile/
 */

import { StyleSheet, Text, View } from 'react-native';

import { Badge, Button } from '@/components/ui';
import { CrownIcon } from '@/features/profile/components/ProfileIcons';
import { colors, layout, spacing, typography } from '@/theme';

interface SubscriptionCardProps {
  isPro: boolean;
  onManage: () => void;
  onUpgrade: () => void;
}

export function SubscriptionCard({
  isPro,
  onManage,
  onUpgrade,
}: SubscriptionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.mark}>
          <CrownIcon size={20} color={colors.gold.default} />
        </View>
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Caddie Pro</Text>
            {isPro ? <Badge label="Pro" variant="gold" size="sm" /> : null}
          </View>
          <Text style={styles.subtitle}>
            {isPro
              ? "You're a Pro member"
              : 'AI coaching, side-by-side compare, and more'}
          </Text>
        </View>
      </View>

      <View style={styles.cta}>
        {isPro ? (
          <Button
            label="Manage subscription"
            onPress={onManage}
            variant="secondary"
            fullWidth
          />
        ) : (
          <Button
            label="Upgrade to Pro"
            onPress={onUpgrade}
            variant="primary"
            fullWidth
          />
        )}
      </View>
    </View>
  );
}

const MARK_FILL = 'rgba(201,168,76,0.12)';
const MARK_BORDER = 'rgba(201,168,76,0.25)';

const styles = StyleSheet.create({
  card: {
    marginTop: spacing[4],
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.gold.muted,
    borderRadius: layout.borderRadius.xl,
    padding: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: layout.borderRadius.md,
    backgroundColor: MARK_FILL,
    borderWidth: 1,
    borderColor: MARK_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  title: {
    ...typography.title3,
    fontSize: 16,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: 3,
  },
  cta: {
    marginTop: spacing[3] + 1,
  },
});
