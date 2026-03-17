const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Plugin pour nettoyer les permissions inutiles de l'AndroidManifest
 */
module.exports = function withCleanPermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Permissions à supprimer (obsolètes ou inutiles)
    const permissionsToRemove = [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ];

    // Supprimer les permissions indésirables
    if (androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = androidManifest.manifest['uses-permission'].filter(
        (perm) => {
          const permName = perm.$['android:name'];
          return !permissionsToRemove.includes(permName);
        }
      );
    }

    return config;
  });
};
