const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable symlinks for pnpm support
config.resolver.unstable_enableSymlinks = true;
// Enable package exports for modern library support
config.resolver.unstable_enablePackageExports = true;

// Fix for pnpm on Windows: normalize all paths to prevent double drive letters
if (process.platform === 'win32') {
  // Normalize project root
  config.projectRoot = path.normalize(__dirname);

  // Normalize watch folders and include node_modules and its pnpm store if needed
  const projectRoot = config.projectRoot;
  config.watchFolders = [
    projectRoot,
    path.join(projectRoot, 'node_modules'),
  ];

  // Optional: Add a custom resolver to handle potential double drive letters
  const originalResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Block native-only imports on web
    if (platform === 'web' && moduleName.includes('codegenNativeCommands')) {
      return {
        type: 'empty',
      };
    }

    try {
      if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    } catch (error) {
      // Logic to handle specific resolution errors could go here if needed
      throw error;
    }
  };
}

module.exports = config;

