/**
 * LibraryFilterBar — Feature component
 * The search field + advanced-filter button + quick-filter chip row beneath
 * the "Your swings" header (Design/Caddie Screens.dc.html §04). The search
 * field and the All / Driver / Irons / Analysed chips are wired; the sliders
 * button is a placeholder for the Phase 1.8 filter sheet (TODO.md).
 *
 * Presentational — the screen owns the query/filter state and the derive.
 *
 * Part of: src/features/library/
 */

import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import {
  LIBRARY_FILTERS,
  type LibraryFilter,
} from '@/features/library/libraryFilter';
import { colors, layout, spacing } from '@/theme';

interface LibraryFilterBarProps {
  query: string;
  onChangeQuery: (query: string) => void;
  filter: LibraryFilter;
  onChangeFilter: (filter: LibraryFilter) => void;
  onPressMoreFilters: () => void;
}

export function LibraryFilterBar({
  query,
  onChangeQuery,
  filter,
  onChangeFilter,
  onPressMoreFilters,
}: LibraryFilterBarProps) {
  return (
    <View style={styles.root}>
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
            <Circle cx={11} cy={11} r={7} stroke={colors.text.tertiary} strokeWidth={2} />
            <Line
              x1={21}
              y1={21}
              x2={16.5}
              y2={16.5}
              stroke={colors.text.tertiary}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
          <TextInput
            value={query}
            onChangeText={onChangeQuery}
            placeholder="Search by club or date"
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            selectionColor={colors.gold.default}
            style={styles.searchInput}
            accessibilityLabel="Search swings"
          />
        </View>
        <Pressable
          onPress={onPressMoreFilters}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="More filters"
          style={styles.filterButton}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Line x1={4} y1={7} x2={20} y2={7} stroke={colors.text.primary} strokeWidth={2} strokeLinecap="round" />
            <Line x1={7} y1={12} x2={17} y2={12} stroke={colors.text.primary} strokeWidth={2} strokeLinecap="round" />
            <Line x1={10} y1={17} x2={14} y2={17} stroke={colors.text.primary} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>

      <View style={styles.chipRow}>
        {LIBRARY_FILTERS.map(({ key, label }) => {
          const selected = key === filter;
          return (
            <Pressable
              key={key}
              onPress={() => onChangeFilter(key)}
              hitSlop={{ top: 8, bottom: 8 }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={label}
              style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const RADIUS_12 = layout.borderRadius.md + 2;

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: spacing[3],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2] + 2,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2] + 1,
    height: 40,
    paddingHorizontal: spacing[3] + 1,
    borderRadius: RADIUS_12,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontSize: 14,
    color: colors.text.primary,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS_12,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  chip: {
    height: 30,
    paddingHorizontal: spacing[3] + 1,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.bg.overlay,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  chipLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  chipLabelSelected: {
    color: colors.bg.base,
  },
});
