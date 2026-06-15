module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
        },
        extensions: [
          '.ios.tsx',
          '.android.tsx',
          '.tsx',
          '.ios.ts',
          '.android.ts',
          '.ts',
          '.ios.jsx',
          '.android.jsx',
          '.jsx',
          '.ios.js',
          '.android.js',
          '.js',
          '.json',
        ],
      },
    ],
    // Zod v4 uses `export * as ns from '...'` which the default RN babel
    // preset doesn't transform. Adding the dedicated plugin so Metro
    // can bundle zod's `external.js` without choking on the syntax.
    '@babel/plugin-transform-export-namespace-from',
    // Reanimated 4 uses react-native-worklets for its worklet engine; the
    // plugin must be LAST in the plugins array so all other transforms
    // run first.
    'react-native-worklets/plugin',
  ],
};
