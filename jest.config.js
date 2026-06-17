module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Supabase Edge Functions are Deno and have their own *.test.ts run by
  // `deno test` — keep them out of the RN Jest run.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/supabase/'],
  // react-native-reanimated is mocked wholesale in jest.setup.js, so its
  // real sources are never required — no transform exception needed.
};
