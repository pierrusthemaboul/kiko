const { withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');

function withAdmobManifest(config) {
  return withAndroidManifest(config, config => {
    const androidManifest = config.modResults;
    if (
      androidManifest?.manifest?.application &&
      androidManifest.manifest.application.length > 0
    ) {
      // On prend le premier tag <application>
      const application = androidManifest.manifest.application[0];
      // Assurez-vous qu'il y a un tableau meta-data
      if (!application['meta-data']) {
        application['meta-data'] = [];
      }

      // Vérifier si une entrée pour 'android.adservices.AD_SERVICES_CONFIG' existe déjà
      const existingEntry = application['meta-data'].find(
        meta =>
          meta.$ &&
          meta.$['android:name'] === 'android.adservices.AD_SERVICES_CONFIG'
      );

      if (existingEntry) {
        // Mettre à jour l'entrée existante en ajoutant tools:replace si elle n'existe pas déjà
        existingEntry.$['tools:replace'] = 'android:resource';
      } else {
        // Ajouter la balise meta-data pour AdMob
        application['meta-data'].push({
          $: {
            'android:name': 'android.adservices.AD_SERVICES_CONFIG',
            'android:resource': '@xml/gma_ad_services_config',
            'tools:replace': 'android:resource'
          }
        });
      }
    }
    return config;
  });
}

module.exports = createRunOncePlugin(withAdmobManifest, 'withAdmobManifest', '1.0.0');
