/**
 * ProfileIdentityCard — Feature component
 * The identity card atop ProfileScreen (Design §06, L1019–1031): avatar with
 * an edit pencil badge, display name, email, and a hand/handicap subtitle.
 *
 * Avatar upload is deferred (Phase 5.4) — the pencil + card press call
 * `onEdit`, which the screen wires to a "coming soon" toast. Composes the
 * shared `Avatar` (initials or `avatarUrl`). Part of: src/features/profile/
 */

import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Card } from '@/components/ui';
import { ChevronIcon, PencilIcon } from '@/features/profile/components/ProfileIcons';
import { colors, spacing, typography } from '@/theme';

interface ProfileIdentityCardProps {
  name: string;
  email: string | null;
  subtitle: string;
  avatarUrl: string | null;
  onEdit: () => void;
}

export function ProfileIdentityCard({
  name,
  email,
  subtitle,
  avatarUrl,
  onEdit,
}: ProfileIdentityCardProps) {
  return (
    <Card variant="raised" onPress={onEdit}>
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          <Avatar
            size="lg"
            name={name}
            source={avatarUrl ? { uri: avatarUrl } : undefined}
          />
          <View style={styles.editBadge}>
            <PencilIcon size={12} color={colors.text.secondary} />
          </View>
        </View>

        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {email ? (
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <ChevronIcon />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3] + 2,
  },
  avatarWrap: {
    width: 72,
    height: 72,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg.input,
    borderWidth: 1,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.title1,
  },
  email: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: 2,
  },
  subtitle: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing[1] + 2,
  },
});
