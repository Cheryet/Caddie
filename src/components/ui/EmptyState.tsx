/**
 * EmptyState — UI primitive
 * Standard empty-list / no-content presentation. Every list screen in
 * the app must render this when its data is empty (DESIGN_SYSTEM.md §10).
 *
 * Layout (centred, vertical):
 *   icon  — 48pt SF Symbol, `text.tertiary`
 *   title — title3 typography, `text.secondary`
 *   body  — body typography, `text.tertiary`
 *   button — optional primary Button for the recovery action
 *
 * If no button is supplied the empty state is purely informational.
 */

import { SFSymbol } from 'react-native-sfsymbols';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { Button } from './Button';

interface EmptyStateProps {
  /** SF Symbol name, e.g. `video.slash` or `folder.badge.questionmark`. */
  icon: string;
  title: string;
  body?: string;
  /** Action label. Omit to render an informational empty state. */
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container} accessibilityRole="summary">
      <SFSymbol
        name={icon}
        color={colors.text.tertiary}
        size={48}
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} variant="primary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  icon: {
    width: 48,
    height: 48,
    marginBottom: spacing[2],
  },
  title: {
    ...typography.title3,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing[4],
  },
});
