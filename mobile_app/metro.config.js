const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Dossier de l'app et dossier racine du projet
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. On surveille la racine pour les node_modules, mais on EXCLUT les dossiers inutiles
config.watchFolders = [workspaceRoot];
config.resolver.blockList = [
  /.*node_modules\/.*\/node_modules\/.*/, // Evite les recursions infinies de pnpm
  /.*\.cxx.*/,
  /.*android\/build.*/,
];

// 2. On indique explicitement où chercher les modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Aide à la résolution pour pnpm et les modules problématiques
config.resolver.extraNodeModules = {
  'react-native-url-polyfill': path.resolve(workspaceRoot, 'node_modules', 'react-native-url-polyfill'),
};

// 4. Support des symlinks (indispensable pour pnpm)
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;
config.resolver.sourceExts = ['ts', 'tsx', 'js', 'jsx', 'json', 'cjs', 'mjs', 'web.ts', 'web.tsx', 'web.js', 'web.jsx'];

module.exports = config;
