/**
 * @format
 */

// Polyfills must load before any module that uses URL / fetch internals.
// supabase-js relies on whatwg URL semantics that React Native does not
// fully implement out of the box.
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
