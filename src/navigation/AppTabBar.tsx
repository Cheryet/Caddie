/**
 * AppTabBar — Custom bottom tab bar
 * Matches Design/TabBar.dc.html pixel-perfect: 4 standard tabs (Home /
 * Library / Tempo / Profile) plus a centre Record FAB that opens the
 * Camera modal on the root stack. The FAB sits 14px above the bar with
 * a gold drop shadow, giving it the "primary action" presence the spec
 * asks for.
 *
 * Icons live in `NavIcons.tsx` with SVG paths copied verbatim from the
 * design file — DO NOT swap them for SF Symbols or any other library.
 *
 * Behavioural rules from the design source:
 *   - Tab label is shown ONLY when the tab is active (`<sc-if value="{{ on }}">`)
 *   - Active colour: `colors.gold.default` / Inactive: `colors.text.tertiary`
 *   - Bar background: `colors.bg.elevated` / top hairline: `colors.border.subtle`
 *   - Bar height: 83pt (includes the home-indicator inset)
 *
 * The FAB navigates to the `Camera` route on the root stack. We type-cast
 * `navigation` because the BottomTab's navigation prop only knows about
 * tabs by default; `Camera` lives one level up. React Navigation resolves
 * the route by bubbling, so the cast is safe at runtime.
 */

import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, layout, spacing, typography } from '@/theme';
import type { AppTabsParamList, RootStackParamList } from '@/navigation/types';

import {
  HomeIcon,
  LibraryIcon,
  ProfileIcon,
  RecordIcon,
  TempoIcon,
} from './NavIcons';
import type { ComponentType } from 'react';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TabIconProps {
  color: string;
  size?: number;
}

interface TabMeta {
  routeName: keyof AppTabsParamList;
  label: string;
  Icon: ComponentType<TabIconProps>;
}

const TABS: TabMeta[] = [
  { routeName: 'HomeTab', label: 'Home', Icon: HomeIcon },
  { routeName: 'LibraryTab', label: 'Library', Icon: LibraryIcon },
  { routeName: 'TempoTab', label: 'Tempo', Icon: TempoIcon },
  { routeName: 'ProfileTab', label: 'Profile', Icon: ProfileIcon },
];

export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  // We render the FAB between the 2nd (Library) and 3rd (Tempo) tabs.
  // Splitting TABS here keeps the JSX flat and obvious.
  const leftTabs = TABS.slice(0, 2);
  const rightTabs = TABS.slice(2);

  const handleTabPress = (routeName: keyof AppTabsParamList) => {
    const isFocused = state.routes[state.index]?.name === routeName;
    if (isFocused) return;
    navigation.navigate(routeName as never);
  };

  const handleRecordPress = () => {
    // `Camera` lives on the root stack one level up; React Navigation
    // resolves it by bubbling. The cast bypasses BottomTab's narrower
    // navigation type.
    (
      navigation as unknown as {
        navigate: (route: keyof RootStackParamList) => void;
      }
    ).navigate('Camera');
  };

  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {leftTabs.map(tab => (
        <TabButton
          key={tab.routeName}
          tab={tab}
          active={state.routes[state.index]?.name === tab.routeName}
          onPress={() => handleTabPress(tab.routeName)}
        />
      ))}
      <View style={styles.fabSlot}>
        <RecordFab onPress={handleRecordPress} />
      </View>
      {rightTabs.map(tab => (
        <TabButton
          key={tab.routeName}
          tab={tab}
          active={state.routes[state.index]?.name === tab.routeName}
          onPress={() => handleTabPress(tab.routeName)}
        />
      ))}
    </View>
  );
}

// ───── Subcomponents ────────────────────────────────────────────────────

interface TabButtonProps {
  tab: TabMeta;
  active: boolean;
  onPress: () => void;
}

function TabButton({ tab, active, onPress }: TabButtonProps) {
  const tint = active ? colors.gold.default : colors.text.tertiary;
  const Icon = tab.Icon;
  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}>
      <Icon color={tint} size={25} />
      {active ? <Text style={styles.tabLabel}>{tab.label}</Text> : null}
    </Pressable>
  );
}

interface RecordFabProps {
  onPress: () => void;
}

function RecordFab({ onPress }: RecordFabProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.94, { duration: 120 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      accessibilityRole="button"
      accessibilityLabel="Record swing"
      style={[styles.fab, animatedStyle]}>
      <RecordIcon color={colors.text.inverse} size={30} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 83,
    backgroundColor: colors.bg.elevated,
    borderTopColor: colors.border.subtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[1] + 2,
    paddingTop: spacing[2] + 1,
  },
  tab: {
    flex: 1,
    height: 54,
    alignItems: 'center',
    gap: spacing[1],
    paddingTop: 3,
  },
  tabLabel: {
    ...typography.overline,
    color: colors.gold.default,
    fontSize: 10,
  },
  // The FAB sits in a flex:1 slot like the other tabs but its content is
  // visually elevated above the bar by a negative top margin.
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  fab: {
    marginTop: -14,
    width: 56,
    height: 56,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.gold.default,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS-only drop shadow per design — `0 8px 20px -5px rgba(201,168,76,0.6)`.
    shadowColor: colors.gold.default,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
});
