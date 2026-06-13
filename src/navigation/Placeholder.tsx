/**
 * Placeholder — Phase 0.3 navigation scaffold
 * Used by every placeholder screen so the scaffold is consistent and tight.
 * Each subsequent phase replaces its target screen with a real
 * implementation; once every screen is real, this file is deleted.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, spacing, typography } from '@/theme';

export interface PlaceholderNavButton {
  label: string;
  onPress: () => void;
}

interface PlaceholderProps {
  title: string;
  phase: string;
  meta?: string;
  navButtons?: PlaceholderNavButton[];
  onClose?: () => void;
}

const EDGES: Edge[] = ['top', 'bottom'];

export function Placeholder({
  title,
  phase,
  meta,
  navButtons,
  onClose,
}: PlaceholderProps) {
  return (
    <SafeAreaView style={styles.container} edges={EDGES}>
      {onClose ? (
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close">
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Placeholder · Phase {phase}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        {navButtons && navButtons.length > 0 ? (
          <View style={styles.buttons}>
            {navButtons.map(b => (
              <Pressable
                key={b.label}
                onPress={b.onPress}
                style={styles.button}
                accessibilityRole="button">
                <Text style={styles.buttonLabel}>{b.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing[3],
  },
  close: {
    ...typography.bodyStrong,
    color: colors.gold.default,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPaddingH,
  },
  title: typography.display,
  subtitle: {
    ...typography.label,
    marginTop: spacing[2],
  },
  meta: {
    ...typography.caption,
    marginTop: spacing[2],
  },
  buttons: {
    marginTop: layout.sectionGap,
    width: '100%',
    gap: layout.itemGap,
  },
  button: {
    backgroundColor: colors.bg.elevated,
    borderColor: colors.border.default,
    borderWidth: spacing.px,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    alignItems: 'center',
  },
  buttonLabel: {
    ...typography.bodyStrong,
    color: colors.gold.default,
  },
});
