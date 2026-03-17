const fs = require('fs');
const path = require('path');

console.log('\n🔍 Vérification de la configuration du build...\n');

// 1. Vérifier la structure des dossiers
const requiredDirs = [
  'plugins',
  'assets/images',
];

const requiredFiles = [
  'app.config.js',
  'eas.json',
  'google-services.json',
  'assets/images/icon.png',
  'assets/images/splash-icon.png',
  'assets/images/logo3.png',
  'plugins/withAdIdPermission.js'
];

let hasError = false;

// Vérifier les dossiers
console.log('📁 Vérification des dossiers...');
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Dossier manquant: ${dir}`);
    hasError = true;
  } else {
    console.log(`✅ ${dir}`);
  }
});

// Vérifier les fichiers
console.log('\n📄 Vérification des fichiers...');
requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ Fichier manquant: ${file}`);
    hasError = true;
  } else {
    console.log(`✅ ${file}`);
  }
});

// Vérifier app.config.js
console.log('\n⚙️  Vérification de app.config.js...');
try {
  const appConfig = require(path.join(process.cwd(), 'app.config.js'));
  const config = appConfig.default({ config: {} });
  
  if (config.android.versionCode) {
    console.log(`✅ versionCode: ${config.android.versionCode}`);
  } else {
    console.error('❌ versionCode manquant');
    hasError = true;
  }
  
  if (config.version) {
    console.log(`✅ version: ${config.version}`);
  } else {
    console.error('❌ version manquante');
    hasError = true;
  }
} catch (error) {
  console.error('❌ Erreur lors de la lecture de app.config.js:', error.message);
  hasError = true;
}

// Vérifier eas.json
console.log('\n📱 Vérification de eas.json...');
try {
  const easConfig = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  if (easConfig.build && easConfig.build.production) {
    console.log('✅ Profil de production trouvé');
  } else {
    console.error('❌ Profil de production manquant dans eas.json');
    hasError = true;
  }
} catch (error) {
  console.error('❌ Erreur lors de la lecture de eas.json:', error.message);
  hasError = true;
}

// Créer le dossier XML si nécessaire
const xmlDir = path.join('android', 'app', 'src', 'main', 'res', 'xml');
if (fs.existsSync('android')) {
  if (!fs.existsSync(xmlDir)) {
    console.log('\n📂 Création du dossier XML...');
    fs.mkdirSync(xmlDir, { recursive: true });
    console.log('✅ Dossier XML créé');
  }
}

if (hasError) {
  console.log('\n❌ Des erreurs ont été détectées. Corrigez-les avant de lancer le build.\n');
  process.exit(1);
} else {
  console.log('\n✅ Toutes les vérifications sont passées ! Prêt pour le build.\n');
}
