module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'node_modules/',
    'ios/',
    'coverage/',
    'Design/',
    'babel.config.js',
    'metro.config.js',
    'jest.config.js',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "CallExpression[callee.object.name='Alert'][callee.property.name='alert']",
        message:
          'Use the Toast or BottomSheet components instead of Alert.alert (AI_IMPLEMENTATION_GUIDE.md §7).',
      },
    ],
    'react-native/no-inline-styles': 'error',
    'react/react-in-jsx-scope': 'off',
  },
};
