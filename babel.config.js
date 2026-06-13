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
  ],
};
