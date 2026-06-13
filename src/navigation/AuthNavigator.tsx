/**
 * AuthNavigator — Navigation
 * Pre-authentication stack. Not rendered yet in Phase 0.3 (the root gate
 * is hardcoded to "authenticated" for scaffolding purposes); Phase 0.6
 * wires the real Supabase session check that switches between this stack
 * and AppNavigator.
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SignInScreen } from '@/features/auth/screens/SignInScreen';
import { SignUpScreen } from '@/features/auth/screens/SignUpScreen';

import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}
