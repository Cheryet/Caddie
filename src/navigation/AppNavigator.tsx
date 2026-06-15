/**
 * AppNavigator — Navigation
 * Authenticated main app: bottom tabs with two nested native stacks
 * (Library and Profile) for push navigation. Uses a custom tab bar
 * (AppTabBar) that matches Design/TabBar.dc.html — 4 tabs plus a centre
 * Record FAB that opens the Camera modal on the root stack.
 *
 * Source of truth: PROJECT_SPEC.md §10 Navigation Architecture +
 * Design/TabBar.dc.html.
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

import { AppTabBar } from './AppTabBar';
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

// Hoisted to module scope so React doesn't see a new tabBar component
// type on every render of AppNavigator (which would force remount of the
// bar each time and lose its internal state).
function renderTabBar(props: React.ComponentProps<typeof AppTabBar>) {
  return <AppTabBar {...props} />;
}

export function AppNavigator() {
  return (
    <Tabs.Navigator
      tabBar={renderTabBar}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="HomeTab" component={HomeScreen} />
      <Tabs.Screen name="LibraryTab" component={LibraryNavigator} />
      <Tabs.Screen name="TempoTab" component={TempoScreen} />
      <Tabs.Screen name="ProfileTab" component={ProfileNavigator} />
    </Tabs.Navigator>
  );
}
