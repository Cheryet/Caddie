/**
 * App — Entry point
 * Providers only, no logic. Order matters: GestureHandlerRootView must
 * wrap NavigationContainer (per react-native-gesture-handler docs), and
 * SafeAreaProvider must be the outermost provider so safe-area insets
 * are available everywhere.
 *
 * @format
 */

import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { OrientationBootstrap } from '@/components/OrientationBootstrap';
import { ToastHost } from '@/components/ui';
import { AuthBootstrap } from '@/features/auth/components/AuthBootstrap';
import { PoseBootstrap } from '@/features/pose/components/PoseBootstrap';
import { RevenueCatBootstrap } from '@/features/subscription/components/RevenueCatBootstrap';
import { UpgradeSheetHost } from '@/features/subscription/components/UpgradeSheet';
import { UploadQueueBootstrap } from '@/features/uploads/components/UploadQueueBootstrap';
import { RootNavigator } from '@/navigation/RootNavigator';

function App() {
  return (
    <GestureHandlerRootView style={rootStyle}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <OrientationBootstrap />
        <AuthBootstrap />
        <RevenueCatBootstrap />
        <UploadQueueBootstrap />
        <PoseBootstrap />
        <RootNavigator />
        <OfflineBanner />
        <UpgradeSheetHost />
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const rootStyle = { flex: 1 } as const;

export default App;
