/**
 * LibrarySkeletonCard — Feature component
 * Loading placeholder shaped like a `VideoCard`. Six of these fill the
 * grid during the initial fetch, matching Caddie Screens.dc.html §04
 * "LibraryScreen · loading" (which shows two shimmer cards above the
 * real grid — here we keep the dimensions identical so the layout
 * doesn't jump when real data arrives).
 *
 * The shimmer animation lives in the shared `Skeleton` primitive so we
 * stay consistent with every other loading state in the app.
 */

import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui';
import { colors, layout, spacing } from '@/theme';

export function LibrarySkeletonCard() {
  return (
    <View style={styles.root}>
      <View style={styles.thumb}>
        <Skeleton width="100%" height="100%" borderRadius={layout.borderRadius.lg} />
      </View>
      <View style={styles.meta}>
        <Skeleton width="60%" height={13} borderRadius={4} />
        <View style={styles.gap} />
        <Skeleton width="42%" height={11} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'column',
  },
  thumb: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: layout.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.elevated,
  },
  meta: {
    paddingTop: 9,
    paddingHorizontal: 2,
  },
  gap: {
    height: spacing[2] - 1, // 7px to match design
  },
});
