const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const fs = require('fs');

const monorepoRoot = path.resolve(__dirname, '../..');

// Reads virtual-store-dir from .npmrc so Metro watches pnpm symlink targets
// (e.g. react-native-css-interop writes .cache/android.js into the store).
function readVirtualStoreDir() {
  try {
    const rc = fs.readFileSync(path.join(monorepoRoot, '.npmrc'), 'utf8');
    const m = rc.match(/^virtual-store-dir\s*=\s*(.+)$/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

const pnpmStore = readVirtualStoreDir();

const config = {
  watchFolders: [monorepoRoot, ...(pnpmStore ? [pnpmStore] : [])],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // Resolve @gluestack-ui/* to compiled ESM via package.json "exports", not raw .ts shims
    unstable_enablePackageExports: true,
    blockList: [
      /[/\\]\.cxx[/\\]/,
      /[/\\]android[/\\]build[/\\]/,
      /[/\\]ios[/\\]build[/\\]/,
    ],
  },
  transformer: {
    // @gluestack-ui and nativewind ship TS sources alongside compiled ESM — transform them
    transformIgnorePatterns: [
      'node_modules/(?!(@gluestack-ui|nativewind|react-native-reanimated|@escronet|@trpc)/)',
    ],
  },
};

module.exports = withNativeWind(
  mergeConfig(getDefaultConfig(__dirname), config),
  { input: './global.css' },
);
