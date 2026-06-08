// nativewind/babel re-exports react-native-css-interop/babel, which in v0.2.5
// unconditionally adds "react-native-worklets/plugin" (a Reanimated v4 dep).
// We're on Reanimated v3, so we inline the two plugins we actually need and skip worklets.
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    require('react-native-css-interop/dist/babel-plugin').default,
    [
      '@babel/plugin-transform-react-jsx',
      { runtime: 'automatic', importSource: 'react-native-css-interop' },
    ],
    'react-native-reanimated/plugin',
  ],
};
