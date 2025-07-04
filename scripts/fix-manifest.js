const fs = require('fs');
const path = require('path');

// Chemin vers le manifeste Android
const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

// Vérifier que le fichier existe
if (!fs.existsSync(manifestPath)) {
  console.error('❌ Erreur: AndroidManifest.xml non trouvé. Avez-vous exécuté expo prebuild ?');
  process.exit(1);
}

// Lire le manifeste
let manifest = fs.readFileSync(manifestPath, 'utf8');

// S'assurer que le namespace tools est présent
if (!manifest.includes('xmlns:tools="http://schemas.android.com/tools"')) {
  manifest = manifest.replace(
    '<manifest',
    '<manifest xmlns:tools="http://schemas.android.com/tools"'
  );
}

// Ajouter la permission AD_ID si elle n'existe pas
if (!manifest.includes('com.google.android.gms.permission.AD_ID')) {
  const permissionTag = '    <uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="replace" />\n';
  
  // Insérer après la première permission
  const firstPermissionIndex = manifest.indexOf('<uses-permission');
  if (firstPermissionIndex !== -1) {
    manifest = manifest.slice(0, firstPermissionIndex) + 
               permissionTag + 
               manifest.slice(firstPermissionIndex);
  }
}

// Ajouter ACCESS_ADSERVICES_AD_ID si elle n'existe pas
if (!manifest.includes('android.permission.ACCESS_ADSERVICES_AD_ID')) {
  const permissionTag = '    <uses-permission android:name="android.permission.ACCESS_ADSERVICES_AD_ID" />\n';
  
  const firstPermissionIndex = manifest.indexOf('<uses-permission');
  if (firstPermissionIndex !== -1) {
    manifest = manifest.slice(0, firstPermissionIndex) + 
               permissionTag + 
               manifest.slice(firstPermissionIndex);
  }
}

// Écrire le manifeste modifié
fs.writeFileSync(manifestPath, manifest);

console.log('✅ Manifeste Android corrigé avec succès!');
console.log('  - Namespace tools ajouté');
console.log('  - Permission AD_ID ajoutée');
console.log('  - Permission ACCESS_ADSERVICES_AD_ID ajoutée');