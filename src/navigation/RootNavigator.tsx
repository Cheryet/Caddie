/**
 * RootNavigator — Navigation
 * Top-level navigator. Branches on auth state, then within the
 * authenticated branch renders the tab navigator plus a sibling modal
 * group for Camera/Playback/Analysis/Comparison. Because the modals are
 * siblings of the tabs in the same native stack, the tab bar is naturally
 * hidden whenever a modal is presented (PROJECT_SPEC.md §10).
 *
 * The auth gate reads from the Zustand store, which is kept in sync by
 * <AuthBootstrap /> (mounted in App.tsx). While the initial session
 * lookup is in flight, we render a minimal splash to avoid flashing the
 * Auth stack to a returning user.
 */

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AnalysisScreen } from '@/features/analysis/screens/AnalysisScreen';
import { CameraScreen } from '@/features/camera/screens/CameraScreen';
import { ComparisonScreen } from '@/features/comparison/screens/ComparisonScreen';
import { PlaybackScreen } from '@/features/playback/screens/PlaybackScreen';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
  const isAuthLoading = useAppStore(s => s.isAuthLoading);
  const isAuthenticated = useAppStore(s => Boolean(s.user));

  if (isAuthLoading) {
    return <Splash />;
  }

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

function Splash() {
  return (
    <View style={splashStyles.container}>
      <ActivityIndicator color={colors.gold.default} />
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
