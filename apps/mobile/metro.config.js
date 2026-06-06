const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const monorepoRoot = path.resolve(__dirname, '../..');

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    blockList: [
      // Exclude Android/iOS build artifacts and pnpm virtual store CMake dirs
      /node_modules[/\\]\.pnpm[/\\].+[/\\]\.cxx[/\\]/,
      /android[/\\]\.cxx[/\\]/,
      /android[/\\]build[/\\]/,
      /ios[/\\]build[/\\]/,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
