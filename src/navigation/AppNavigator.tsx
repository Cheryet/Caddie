/**
 * AppNavigator — Navigation
 * Authenticated main app: bottom tabs with two nested native stacks
 * (Library and Profile) for push navigation. Uses the default React
 * Navigation tab bar in Phase 0.3; the custom themed tab bar with Record
 * FAB arrives in Phase 1.1 alongside the UI component layer.
 *
 * Source of truth: PROJECT_SPEC.md §10 Navigation Architecture
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { LibraryScreen } from '@/features/library/screens/LibraryScreen';
import { VideoDetailScreen } from '@/features/library/screens/VideoDetailScreen';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { SettingsScreen } from '@/features/profile/screens/SettingsScreen';
import { TempoScreen } from '@/features/tempo/screens/TempoScreen';
import { colors } from '@/theme';

import type {
  AppTabsParamList,
  LibraryStackParamList,
  ProfileStackParamList,
} from './types';

const Tabs = createBottomTabNavigator<AppTabsParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function LibraryNavigator() {
  return (
    <LibraryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.elevated },
        headerTintColor: colors.text.primary,
      }}>
      <LibraryStack.Screen
        name="Library"
        component={LibraryScreen}
        options={{ headerShown: false }}
      />
      <LibraryStack.Screen
        name="VideoDetail"
        component={VideoDetailScreen}
        options={{ title: 'Video' }}
      />
    </LibraryStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg.elevated },
        headerTintColor: colors.text.primary,
      }}>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </ProfileStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold.default,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.bg.elevated,
          borderTopColor: colors.border.subtle,
        },
      }}>
      <Tabs.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tabs.Screen
        name="LibraryTab"
        component={LibraryNavigator}
        options={{ title: 'Library' }}
      />
      <Tabs.Screen
        name="TempoTab"
        component={TempoScreen}
        options={{ title: 'Tempo' }}
      />
      <Tabs.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{ title: 'Profile' }}
      />
    </Tabs.Navigator>
  );
}
