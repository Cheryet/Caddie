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
    setLogLevel: jest.fn(),
    LOG_LEVEL: { DEBUG: 'debug', INFO: 'info', WARN: 'warn', ERROR: 'error' },
  },
}));
