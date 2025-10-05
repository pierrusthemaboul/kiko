const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = config.resolver.assetExts ?? [];
if (!config.resolver.assetExts.includes('ogg')) {
  config.resolver.assetExts.push('ogg');
}

module.exports = config;
