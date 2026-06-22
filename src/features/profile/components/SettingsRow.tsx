/**
 * SettingsRow — Feature component
 * The grouped settings-list primitives from Design §06: a `SectionHeader`
 * label, a `SettingsGroup` rounded card that hairline-divides its children,
 * and a `SettingsRow` (leading icon + label + a flexible right slot — a
 * value+chevron, a segmented control, a Toggle, a TextInput, or just a
 * chevron). ≥44pt tap target when interactive.
 *
 * Presentational; the screen supplies handlers/controls. Part of:
 * src/features/profile/
 */

import type { ReactNode } from 'react';
import { Children, Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronIcon } from '@/features/profile/components/ProfileIcons';
import { colors, layout, spacing, typography } from '@/theme';

export function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export function SettingsGroup({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <View style={styles.group}>
      {items.map((child, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={styles.divider} /> : null}
          {child}
        </Fragment>
      ))}
    </View>
  );
}

interface SettingsRowProps {
  icon?: ReactNode;
  label: string;
  /** Right-aligned secondary value text (when there's no custom control). */
  value?: string;
  /** Custom right control (segmented / Toggle / TextInput). */
  right?: ReactNode;
  onPress?: () => void;
  /** Defaults to true for navigational rows (onPress set, no custom right). */
  showChevron?: boolean;
}

export function SettingsRow({
  icon,
  label,
  value,
  right,
  onPress,
  showChevron,
}: SettingsRowProps) {
  const chevron = showChevron ?? (onPress != null && right == null);

  const body = (
    <>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {right ?? (value ? <Text style={styles.value}>{value}</Text> : null)}
      {chevron ? <ChevronIcon /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.row}>
        {body}
      </Pressable>
    );
  }
  return (
    <View style={styles.row} accessibilityLabel={label}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing[6],
    marginBottom: spacing[2] + 2,
    marginLeft: spacing[1],
  },
  group: {
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: layout.borderRadius.lg,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  row: {
    minHeight: 54,
    paddingHorizontal: spacing[3] + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3] + 1,
  },
  icon: {
    width: 20,
    alignItems: 'center',
  },
  label: {
    ...typography.body,
    flex: 1,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
