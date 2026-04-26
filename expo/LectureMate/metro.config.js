const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-web@0.21 ile metro web bundling sorunu icin:
// package.json "exports" field'ini devre disi birak
config.resolver.unstable_enablePackageExports = false;

// expo-sqlite/web wasm asset destegi
config.resolver.assetExts.push('wasm');

module.exports = config;
