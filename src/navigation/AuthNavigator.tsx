/**
 * AuthNavigator — Navigation
 * Pre-authentication stack. Rendered by RootNavigator when the Zustand
 * store has no user. Two screens: the combined sign-in / create-account
 * Auth screen, and the OTP code Verify screen reached after signup or a
 * magic-link request.
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthScreen } from '@/features/auth/screens/AuthScreen';
import { VerifyScreen } from '@/features/auth/screens/VerifyScreen';

import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Verify" component={VerifyScreen} />
    </Stack.Navigator>
  );
}
