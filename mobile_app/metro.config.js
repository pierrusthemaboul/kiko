const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Dossier de l'app et dossier racine du projet
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. On surveille TOUTE la racine (pour trouver les node_modules communs)
config.watchFolders = [workspaceRoot];

// 2. On indique explicitement où chercher les modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Support des symlinks (indispensable pour pnpm)
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// 4. On s'assure que le dossier racine est bien scruté
// (Pas de forçage manuel de config.projectRoot pour éviter les bugs de double lettre de lecteur sur Windows)

module.exports = config;
