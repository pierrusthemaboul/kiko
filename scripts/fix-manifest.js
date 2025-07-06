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

// COPIER LES ASSETS SPLASH MANQUANTS
const assetsDir = path.join(__dirname, '..', 'assets', 'images');
const drawableDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'drawable');

// Créer le dossier drawable s'il n'existe pas
if (!fs.existsSync(drawableDir)) {
  fs.mkdirSync(drawableDir, { recursive: true });
  console.log('✅ Dossier drawable/ créé');
}

// Assets à copier
const assetsToCopy = [
  { src: 'splashscreen_logo.png', dest: 'splashscreen_logo.png' },
  { src: 'splash-icon.png', dest: 'splash_icon.png' },
  { src: 'logo3.png', dest: 'logo3.png' },
  { src: 'icon.png', dest: 'icon.png' }
];

assetsToCopy.forEach(asset => {
  const sourcePath = path.join(assetsDir, asset.src);
  const destPath = path.join(drawableDir, asset.dest);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ ${asset.src} → drawable/${asset.dest}`);
  } else {
    console.log(`⚠️  ${asset.src} non trouvé, ignoré`);
  }
});

console.log('✅ Assets splash copiés vers drawable/');