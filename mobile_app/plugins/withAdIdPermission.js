const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAdIdPermission(config) {
  return withAndroidManifest(config, async config => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;
    const application = manifest.application?.[0];

    // 1. S'assurer que le namespace tools est présent
    if (!manifest.$) {
      manifest.$ = {};
    }
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    // 2. S'assurer que uses-permission existe
    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    // 3. Nettoyer toutes les permissions AD_ID existantes
    manifest['uses-permission'] = manifest['uses-permission'].filter(permission => {
      const name = permission?.$?.['android:name'];
      return name !== 'com.google.android.gms.permission.AD_ID' && 
             name !== 'android.permission.ACCESS_ADSERVICES_AD_ID';
    });

    // 4. Ajouter les permissions AD correctement
    // Permission AD_ID avec tools:node="replace"
    manifest['uses-permission'].push({
      $: {
        'android:name': 'com.google.android.gms.permission.AD_ID',
        'tools:node': 'replace'
      }
    });

    // Permission ACCESS_ADSERVICES_AD_ID pour Android 13+
    manifest['uses-permission'].push({
      $: {
        'android:name': 'android.permission.ACCESS_ADSERVICES_AD_ID'
      }
    });

    // 5. Gérer la meta-data AD_SERVICES_CONFIG dans l'application
    if (application) {
      if (!application['meta-data']) {
        application['meta-data'] = [];
      }

      // Retirer toute ancienne entrée
      application['meta-data'] = application['meta-data'].filter(
        meta => meta?.$?.['android:name'] !== 'android.adservices.AD_SERVICES_CONFIG'
      );

      // Ajouter la nouvelle entrée
      application['meta-data'].push({
        $: {
          'android:name': 'android.adservices.AD_SERVICES_CONFIG',
          'android:resource': '@xml/gma_ad_services_config',
          'tools:replace': 'android:resource'
        }
      });
    }

    console.log('\n=== PLUGIN AD_ID PERMISSION ===');
    console.log('✅ Namespace tools ajouté');
    console.log('✅ Permission AD_ID ajoutée avec tools:node="replace"');
    console.log('✅ Permission ACCESS_ADSERVICES_AD_ID ajoutée');
    console.log('✅ Meta-data AD_SERVICES_CONFIG configurée');
    console.log('===============================\n');

    return config;
  });
};