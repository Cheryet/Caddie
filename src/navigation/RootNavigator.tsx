/**
 * RootNavigator — Navigation
 * Top-level navigator. Branches on auth state, then within the
 * authenticated branch renders the tab navigator plus a sibling modal
 * group for Camera/Playback/Analysis/Comparison. Because the modals are
 * siblings of the tabs in the same native stack, the tab bar is naturally
 * hidden whenever a modal is presented (PROJECT_SPEC.md §10).
 *
 * The `isAuthenticated` flag is hardcoded to true in Phase 0.3 so the
 * main app is reachable for scaffolding. Phase 0.6 replaces this with a
 * real Supabase session check from the Zustand auth store.
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AnalysisScreen } from '@/features/analysis/screens/AnalysisScreen';
import { CameraScreen } from '@/features/camera/screens/CameraScreen';
import { ComparisonScreen } from '@/features/comparison/screens/ComparisonScreen';
import { PlaybackScreen } from '@/features/playback/screens/PlaybackScreen';
import { colors } from '@/theme';

import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Phase 0.6 swaps this for `useAppStore(s => Boolean(s.user))`.
const isAuthenticated = true;

const navTheme = {
  dark: true,
  colors: {
    primary: colors.gold.default,
    background: colors.bg.base,
    card: colors.bg.elevated,
    text: colors.text.primary,
    border: colors.border.subtle,
    notification: colors.semantic.error,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Tabs" component={AppNavigator} />
            <Stack.Group
              screenOptions={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}>
              <Stack.Screen name="Camera" component={CameraScreen} />
              <Stack.Screen name="Playback" component={PlaybackScreen} />
              <Stack.Screen name="Analysis" component={AnalysisScreen} />
              <Stack.Screen name="Comparison" component={ComparisonScreen} />
            </Stack.Group>
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
