/**
 * Avatar — UI primitive
 * Circular user representation. Renders an image when `source` is given,
 * falls back to up-to-two initials drawn over a neutral background.
 *
 * Three sizes — sm 32 / md 48 / lg 72. Picks initials from `name` by
 * taking the first letter of the first two whitespace-separated words.
 */

import { Image, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { colors, typography } from '@/theme';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  /** Remote or local image source. Omit for initials fallback. */
  source?: ImageSourcePropType;
  /** Used to derive initials when `source` is absent. */
  name?: string;
  size?: AvatarSize;
}

const DIMENSION: Record<AvatarSize, number> = { sm: 32, md: 48, lg: 72 };
const FONT_SIZE: Record<AvatarSize, number> = { sm: 13, md: 17, lg: 24 };

export function Avatar({ source, name, size = 'md' }: AvatarProps) {
  const dim = DIMENSION[size];
  const base = { width: dim, height: dim, borderRadius: dim / 2 };

  if (source) {
    return (
      <Image
        source={source}
        style={[styles.image, base]}
        accessibilityIgnoresInvertColors
      />
    );
  }

  const initials = deriveInitials(name);

  return (
    <View style={[styles.fallback, base]} accessibilityRole="image">
      <Text style={[styles.initials, { fontSize: FONT_SIZE[size] }]}>
        {initials || '?'}
      </Text>
    </View>
  );
}

function deriveInitials(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p.charAt(0).toUpperCase()).join('');
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.bg.input,
  },
  fallback: {
    backgroundColor: colors.bg.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...typography.labelStrong,
    color: colors.text.primary,
  },
});
