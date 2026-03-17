const { withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');

function withAdmobManifest(config) {
  return withAndroidManifest(config, config => {
    const androidManifest = config.modResults;
    const application = androidManifest?.manifest?.application?.[0];
    const manifest = androidManifest.manifest;

    // 1. S'assurer que le namespace tools est présent
    if (!manifest.$) {
      manifest.$ = {};
    }
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    // 2. Gérer les meta-data pour AD_SERVICES_CONFIG
    if (application) {
      if (!application['meta-data']) {
        application['meta-data'] = [];
      }
      
      // Retirer toute ancienne entrée
      application['meta-data'] = application['meta-data'].filter(
        meta => !(meta.$ && meta.$['android:name'] === 'android.adservices.AD_SERVICES_CONFIG')
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

    // 3. Gérer les permissions
    if (!Array.isArray(manifest['uses-permission'])) {
      manifest['uses-permission'] = [];
    }
    
    // Retirer TOUTES les permissions AD_ID existantes (même mal formées)
    manifest['uses-permission'] = manifest['uses-permission'].filter(permission => {
      if (!permission || !permission.$) return true; // Garder les permissions mal formées pour ne pas casser
      const permName = permission.$['android:name'];
      return permName !== 'com.google.android.gms.permission.AD_ID';
    });
    
    // Ajouter la permission AD_ID correctement formatée EN PREMIER
    manifest['uses-permission'].unshift({
      $: {
        'android:name': 'com.google.android.gms.permission.AD_ID',
        'tools:node': 'replace'
      }
    });

    // 4. IMPORTANT : Vérifier aussi android.permission.ACCESS_ADSERVICES_AD_ID (Android 13+)
    const hasAdServicesPermission = manifest['uses-permission'].some(
      p => p.$ && p.$['android:name'] === 'android.permission.ACCESS_ADSERVICES_AD_ID'
    );
    
    if (!hasAdServicesPermission) {
      manifest['uses-permission'].push({
        $: {
          'android:name': 'android.permission.ACCESS_ADSERVICES_AD_ID'
        }
      });
    }

    // 5. Logging pour debug
    console.log('\n=== PLUGIN ADMOB MANIFEST ===');
    console.log('✅ Namespace tools ajouté');
    console.log('✅ Meta-data AD_SERVICES_CONFIG ajoutée');
    console.log('✅ Permission AD_ID ajoutée avec tools:node="replace"');
    console.log('✅ Permission ACCESS_ADSERVICES_AD_ID vérifiée');
    
    // Vérification finale
    const adIdPermission = manifest['uses-permission'].find(
      p => p.$ && p.$['android:name'] === 'com.google.android.gms.permission.AD_ID'
    );
    console.log('🔍 Vérification finale AD_ID:', adIdPermission ? 'PRÉSENTE' : 'ABSENTE');
    console.log('=============================\n');

    return config;
  });
}

module.exports = createRunOncePlugin(withAdmobManifest, 'withAdmobManifest', '2.0.0');