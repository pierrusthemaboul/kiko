const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. On surveille la racine pour les node_modules
config.watchFolders = [workspaceRoot];

// 2. On indique explicitement où chercher les modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Support des symlinks (indispensable pour pnpm)
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
