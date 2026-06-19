/**
 * Jest setup — global mocks for native modules that jest can't load.
 * Loaded via setupFiles in jest.config.js before each test file.
 */

// react-native-mmkv has a native module — under jest we replace it with an
// in-memory store so the Zustand persist middleware and any direct
// callers behave like real storage.
jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    createMMKV: () => ({
      getString: key =>
        store.has(key) ? String(store.get(key)) : undefined,
      set: (key, value) => {
        store.set(key, value);
      },
      remove: key => {
        store.delete(key);
      },
      clearAll: () => store.clear(),
    }),
  };
});

// react-native-config reads from a generated native file at runtime —
// under jest there is no native bundle, so return an empty config object
// and let any code under test specify its own env via process.env if it
// needs to. Phase 0.5's supabase client throws when its env is missing,
// so anything that imports the real supabase client must mock it
// separately at the test level.
jest.mock('react-native-config', () => ({
  __esModule: true,
  default: {},
}));

// react-native-purchases has a native iOS module that jest can't load.
// Stub the surface our wrapper uses (configure / getCustomerInfo /
// setLogLevel / LOG_LEVEL enum). Tests that need specific behaviour
// per-case override these mocks at the test level.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getCustomerInfo: jest
      .fn()
      .mockResolvedValue({ entitlements: { active: {} } }),
    // Phase 4.5 purchase flow. Defaults: no current offering, an empty
    // entitlement set. Tests override per-case with mockResolvedValueOnce.
    getOfferings: jest.fn().mockResolvedValue({ current: null, all: {} }),
    purchasePackage: jest
      .fn()
      .mockResolvedValue({
        customerInfo: { entitlements: { active: {} } },
        productIdentifier: '',
      }),
    restorePurchases: jest
      .fn()
      .mockResolvedValue({ entitlements: { active: {} } }),
    setLogLevel: jest.fn(),
    LOG_LEVEL: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' },
  },
}));

// react-native-reanimated 4's bundled mock pulls in react-native-worklets
// which tries to access a native module at require time. Provide a hand-
// rolled stub of just the API surface our components use — shared values
// become plain refs, animated styles return empty objects, transition
// helpers resolve to their target synchronously.
jest.mock('react-native-reanimated', () => {
  const { Text, View } = require('react-native');
  // The transition helpers return their target synchronously and DO NOT
  // invoke completion callbacks. Calling the callback under jest would
  // simulate the animation finishing immediately, which can confuse
  // tests that drive auto-dismiss timers or completion-triggered state
  // transitions (e.g. Toast's auto-hide). Components are responsible
  // for testing dismissal via the imperative API or fake timers.
  const passthrough = toValue => toValue;
  return {
    __esModule: true,
    default: {
      View,
      Text,
      createAnimatedComponent: Component => Component,
    },
    View,
    Text,
    Easing: {
      inOut: fn => fn ?? (() => 0),
      out: fn => fn ?? (() => 0),
      in: fn => fn ?? (() => 0),
      ease: () => 0,
      cubic: () => 0,
      linear: () => 0,
    },
    runOnJS: fn => fn,
    useAnimatedStyle: () => ({}),
    // SwingScore animates an SVG circle's strokeDashoffset via animated
    // props. The stub returns an empty object — the ring renders at its
    // static stroke-dash attrs, which is all the component tests assert on.
    useAnimatedProps: () => ({}),
    useReducedMotion: () => false,
    useSharedValue: init => ({ value: init }),
    withDelay: (_delay, animation) => animation,
    withRepeat: animation => animation,
    withSpring: passthrough,
    withTiming: passthrough,
  };
});

// react-native-sfsymbols renders a native iOS view. Under jest there's
// no native side, so stub it with a plain accessible View carrying the
// symbol name for assertion.
jest.mock('react-native-sfsymbols', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    SFSymbol: ({ name, ...rest }) =>
      React.createElement(View, {
        accessibilityLabel: `SFSymbol:${name}`,
        ...rest,
      }),
  };
});

// react-native-compressor is a Nitro-Modules native package. Stub the
// surface our upload pipeline uses: Video.compress, createVideoThumbnail,
// uuidv4. Tests can override per-case via mockResolvedValueOnce.
jest.mock('react-native-compressor', () => ({
  __esModule: true,
  Video: {
    compress: jest.fn().mockResolvedValue('/tmp/mock-compressed.mp4'),
    cancelCompression: jest.fn(),
    activateBackgroundTask: jest.fn().mockResolvedValue(undefined),
    deactivateBackgroundTask: jest.fn().mockResolvedValue(undefined),
  },
  createVideoThumbnail: jest.fn().mockResolvedValue({
    path: '/tmp/mock-thumb.jpg',
    size: 1024,
    mime: 'image/jpeg',
    width: 100,
    height: 100,
  }),
  uuidv4: jest.fn(() => 'test-uuid-0000-0000'),
}));

// react-native-svg also wraps native iOS/Android views. Under jest each
// SVG primitive becomes an inert View so component trees render and
// `getByLabelText` queries on the parent Pressable still find their
// children.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name) => {
    const Component = (props) =>
      React.createElement(View, { ...props, testID: `svg-${name}` });
    Component.displayName = `Mock${name}`;
    return Component;
  };
  return {
    __esModule: true,
    default: stub('Svg'),
    Svg: stub('Svg'),
    Path: stub('Path'),
    Circle: stub('Circle'),
    Line: stub('Line'),
    Rect: stub('Rect'),
    G: stub('G'),
    Text: stub('SvgText'),
    Polygon: stub('Polygon'),
    Polyline: stub('Polyline'),
    Defs: stub('Defs'),
    LinearGradient: stub('LinearGradient'),
    RadialGradient: stub('RadialGradient'),
    Stop: stub('Stop'),
    ClipPath: stub('ClipPath'),
    Mask: stub('Mask'),
    Ellipse: stub('Ellipse'),
  };
});

// react-native-image-picker ships as untranspiled TypeScript in newer
// versions. jest's default transform doesn't touch node_modules, so
// the bare `import { Platform }` at the top of its entry trips a
// SyntaxError. Stub the surface our wrapper uses (launchImageLibrary)
// so tests can drive the picker without resolving the real module.
jest.mock('react-native-image-picker', () => ({
  __esModule: true,
  launchImageLibrary: jest.fn().mockResolvedValue({ didCancel: true }),
}));

// @shopify/flash-list ships native iOS/Android views. Under jest we
// substitute a plain ScrollView-backed component so tests can render
// items and assert on them. Mirrors the props we use (data, renderItem,
// keyExtractor, refreshing, onRefresh, numColumns).
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { ScrollView, RefreshControl, View } = require('react-native');
  const FlashList = (props) => {
    const items = (props.data ?? []).map((item, index) => {
      const key = props.keyExtractor
        ? props.keyExtractor(item, index)
        : String(index);
      return React.createElement(
        View,
        { key },
        props.renderItem
          ? props.renderItem({ item, index, target: 'Cell' })
          : null,
      );
    });
    return React.createElement(
      ScrollView,
      {
        contentContainerStyle: props.contentContainerStyle,
        refreshControl: props.onRefresh
          ? React.createElement(RefreshControl, {
              refreshing: !!props.refreshing,
              onRefresh: props.onRefresh,
            })
          : undefined,
        testID: 'flash-list',
      },
      items,
    );
  };
  return { __esModule: true, FlashList };
});

// react-native-vision-camera is a Nitro-Modules native package. Stub
// the surface our wrapper + CameraScreen use:
//   - useCameraPermission / useMicrophonePermission hooks (default to
//     not-determined; individual tests override via mockReturnValueOnce)
//   - useCameraDevice hook (defaults to a fake back camera so the
//     "granted" branch renders by default; tests opt into noDevice by
//     mocking it to return undefined)
//   - Camera component (stub View)
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const notDetermined = {
    status: 'not-determined',
    hasPermission: false,
    canRequestPermission: true,
    requestPermission: jest.fn().mockResolvedValue(false),
  };
  // Recorder stub — startRecording does NOT fire onFinished by itself;
  // tests that need to assert post-record navigation call the captured
  // callback directly. stopRecording resolves immediately.
  const makeRecorder = () => ({
    isRecording: false,
    isPaused: false,
    recordedDuration: 0,
    recordedFileSize: 0,
    filePath: '/tmp/mock-recording.mov',
    startRecording: jest.fn().mockResolvedValue(undefined),
    stopRecording: jest.fn().mockResolvedValue(undefined),
    pauseRecording: jest.fn().mockResolvedValue(undefined),
    resumeRecording: jest.fn().mockResolvedValue(undefined),
    cancelRecording: jest.fn().mockResolvedValue(undefined),
  });
  return {
    __esModule: true,
    Camera: ({ style }) => React.createElement(View, { style }),
    useCameraPermission: jest.fn(() => ({ ...notDetermined })),
    useMicrophonePermission: jest.fn(() => ({ ...notDetermined })),
    useCameraDevice: jest.fn(() => ({ id: 'mock-back', position: 'back' })),
    useVideoOutput: jest.fn(() => ({
      createRecorder: jest.fn().mockResolvedValue(makeRecorder()),
      getSupportedVideoCodecs: jest.fn(() => []),
      setOutputSettings: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

// react-native-orientation-locker is a native module; stub the lock/unlock
// surface our core/orientation wrapper calls so it's a no-op under jest.
jest.mock('react-native-orientation-locker', () => ({
  __esModule: true,
  default: {
    lockToPortrait: jest.fn(),
    unlockAllOrientations: jest.fn(),
    lockToLandscape: jest.fn(),
    addOrientationListener: jest.fn(),
    removeOrientationListener: jest.fn(),
  },
}));
