const { withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');

function withAdmobManifest(config) {
  return withAndroidManifest(config, config => {
    const androidManifest = config.modResults;
    const application = androidManifest?.manifest?.application?.[0];
    const manifest = androidManifest.manifest;

    // ----- PARTIE 1 : VOTRE CODE EXISTANT (pour la balise meta-data) -----
    // On ne change rien ici, on s'assure juste qu'il est bien là.
    if (application) {
      if (!application['meta-data']) {
        application['meta-data'] = [];
      }
      const existingEntry = application['meta-data'].find(
        meta =>
          meta.$ &&
          meta.$['android:name'] === 'android.adservices.AD_SERVICES_CONFIG'
      );
      if (existingEntry) {
        existingEntry.$['tools:replace'] = 'android:resource';
      } else {
        application['meta-data'].push({
          $: {
            'android:name': 'android.adservices.AD_SERVICES_CONFIG',
            'android:resource': '@xml/gma_ad_services_config',
            'tools:replace': 'android:resource'
          }
        });
      }
    }

    // ----- PARTIE 2 : NOUVEAU CODE (pour la permission AD_ID) -----
    // C'est la partie que nous ajoutons pour résoudre notre problème.
    if (!Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = [];
    }
    // On retire une éventuelle ancienne déclaration pour éviter les conflits
    manifest['uses-permission'] = manifest['uses-permission'].filter(
      (p) => p.$['android:name'] !== 'com.google.android.gms.permission.AD_ID'
    );
    // On ajoute notre permission avec l'instruction pour forcer son inclusion
    manifest['uses-permission'].push({
      $: {
        'android:name': 'com.google.android.gms.permission.AD_ID',
        'tools:node': 'replace', // L'instruction magique !
      },
    });

    return config;
  });
}

module.exports = createRunOncePlugin(withAdmobManifest, 'withAdmobManifest', '1.0.0');