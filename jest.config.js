module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // react-native-reanimated is mocked wholesale in jest.setup.js, so its
  // real sources are never required — no transform exception needed.
};
