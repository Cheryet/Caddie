/**
 * @format
 */

// Polyfills must load before any module that uses URL / fetch internals.
// supabase-js relies on whatwg URL semantics that React Native does not
// fully implement out of the box.
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

if (__DEV__) {
  // react-native-orientation-locker logs this from its native module's
  // teardown (-[Orientation dealloc] → removeListeners) on the New
  // Architecture. RCTEventEmitter self-clamps the listener count, so it's
  // harmless and dev-only (RCTLogError doesn't red-box in release), and our
  // code adds no orientation listeners — we only lock/unlock. Silence the
  // dev red box; revisit if the library ships a New-Architecture fix (TODO.md).
  LogBox.ignoreLogs([
    'Attempted to remove more Orientation listeners than added',
  ]);
}

AppRegistry.registerComponent(appName, () => App);
