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
import { InsightDetailScreen } from '@/features/analysis/screens/InsightDetailScreen';
import { CameraScreen } from '@/features/camera/screens/CameraScreen';
import { ComparisonScreen } from '@/features/comparison/screens/ComparisonScreen';
import { OnboardingScreen } from '@/features/onboarding/screens/OnboardingScreen';
import { useIsOnboarded } from '@/features/onboarding/onboardingStore';
import { PlaybackScreen } from '@/features/playback/screens/PlaybackScreen';
import { ChangePasswordScreen } from '@/features/profile/screens/ChangePasswordScreen';
import { EditNameScreen } from '@/features/profile/screens/EditNameScreen';
import { RedeemCodeScreen } from '@/features/profile/screens/RedeemCodeScreen';
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
  const userId = useAppStore(s => s.user?.id ?? null);
  const isAuthenticated = userId !== null;
  // Reactive: completing setup flips this and swaps Onboarding → Tabs.
  const onboarded = useIsOnboarded(userId);

  if (isAuthLoading) {
    return <Splash />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="AuthStack" component={AuthNavigator} />
        ) : !onboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
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
              {/* Drill-down off the report. Analysis is a fullScreenModal, so a
                  `card` here would push onto the base stack *behind* it and never
                  be seen — it must be presented as its own modal on top. The
                  right-slide keeps the "push" feel rather than a bottom sheet. */}
              <Stack.Screen
                name="InsightDetail"
                component={InsightDetailScreen}
                options={{
                  presentation: 'fullScreenModal',
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen name="Comparison" component={ComparisonScreen} />
              {/* Profile edit sub-pages — modal-presented so the custom tab
                  bar is hidden and the keyboard has room (Design § edit
                  sub-pages). */}
              <Stack.Screen name="EditName" component={EditNameScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
              <Stack.Screen name="RedeemCode" component={RedeemCodeScreen} />
            </Stack.Group>
          </>
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
