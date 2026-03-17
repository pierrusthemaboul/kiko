const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔍 DIAGNOSTIC COMPLET PRÉ-BUILD ANDROID\n');

let hasError = false;
let hasWarning = false;

// 1. Vérifier les versions des outils
console.log('📦 Versions des outils :');
try {
  const easVersion = execSync('eas --version', { encoding: 'utf8' }).trim();
  console.log(`✅ EAS CLI: ${easVersion}`);
} catch (e) {
  console.error('❌ EAS CLI non installé');
  hasError = true;
}

try {
  const expoVersion = execSync('expo --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Expo CLI: ${expoVersion}`);
} catch (e) {
  console.error('❌ Expo CLI non installé');
  hasError = true;
}

// 2. Vérifier AndroidManifest.xml
console.log('\n📄 Vérification du AndroidManifest.xml :');
const manifestPath = path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  
  // Vérifier le namespace tools
  if (manifest.includes('xmlns:tools="http://schemas.android.com/tools"')) {
    console.log('✅ Namespace tools présent');
  } else {
    console.error('❌ Namespace tools manquant');
    hasError = true;
  }
  
  // Vérifier la permission AD_ID
  if (manifest.includes('com.google.android.gms.permission.AD_ID') && manifest.includes('tools:node="replace"')) {
    console.log('✅ Permission AD_ID avec tools:node="replace"');
  } else {
    console.error('❌ Permission AD_ID mal configurée');
    hasError = true;
  }
  
  // Vérifier ACCESS_ADSERVICES_AD_ID
  if (manifest.includes('android.permission.ACCESS_ADSERVICES_AD_ID')) {
    console.log('✅ Permission ACCESS_ADSERVICES_AD_ID présente');
  } else {
    console.warn('⚠️  Permission ACCESS_ADSERVICES_AD_ID manquante (Android 13+)');
    hasWarning = true;
  }
  
  // Vérifier meta-data AD_SERVICES_CONFIG
  if (manifest.includes('android.adservices.AD_SERVICES_CONFIG')) {
    console.log('✅ Meta-data AD_SERVICES_CONFIG présente');
  } else {
    console.error('❌ Meta-data AD_SERVICES_CONFIG manquante');
    hasError = true;
  }
} else {
  console.error('❌ AndroidManifest.xml non trouvé');
  hasError = true;
}

// 3. Vérifier le fichier XML de configuration
console.log('\n📂 Vérification des fichiers de configuration :');
const xmlConfigPath = path.join('android', 'app', 'src', 'main', 'res', 'xml', 'gma_ad_services_config.xml');
if (fs.existsSync(xmlConfigPath)) {
  const xmlContent = fs.readFileSync(xmlConfigPath, 'utf8');
  if (xmlContent.includes('<ad-services-config>') && 
      xmlContent.includes('<topics-api>') && 
      xmlContent.includes('<attribution-api>') && 
      xmlContent.includes('<custom-audiences-api>')) {
    console.log('✅ gma_ad_services_config.xml correctement configuré');
  } else {
    console.error('❌ gma_ad_services_config.xml mal configuré');
    hasError = true;
  }
} else {
  console.error('❌ gma_ad_services_config.xml manquant');
  hasError = true;
}

// 4. Vérifier gradle.properties
console.log('\n⚙️  Vérification de Gradle :');
const gradlePropertiesPath = path.join('android', 'gradle.properties');
if (fs.existsSync(gradlePropertiesPath)) {
  const gradleProps = fs.readFileSync(gradlePropertiesPath, 'utf8');
  
  // Vérifier Kotlin version
  const kotlinMatch = gradleProps.match(/kotlinVersion=(.+)/);
  if (kotlinMatch) {
    const kotlinVersion = kotlinMatch[1];
    console.log(`📌 Kotlin version: ${kotlinVersion}`);
    if (kotlinVersion !== '1.9.25') {
      console.warn(`⚠️  Version Kotlin différente de 1.9.25 (actuelle: ${kotlinVersion})`);
      hasWarning = true;
    }
  } else {
    console.warn('⚠️  kotlinVersion non définie dans gradle.properties');
    hasWarning = true;
  }
  
  // Vérifier autres propriétés importantes
  if (gradleProps.includes('org.gradle.jvmargs=')) {
    console.log('✅ JVM args configurés');
  } else {
    console.warn('⚠️  JVM args non configurés (peut causer des problèmes de mémoire)');
  }
} else {
  console.error('❌ gradle.properties non trouvé');
  hasError = true;
}

// 5. Vérifier build.gradle (app)
console.log('\n📱 Vérification de build.gradle :');
const buildGradlePath = path.join('android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  
  // Vérifier compileSdkVersion
  const compileSdkMatch = buildGradle.match(/compileSdk[Version]?\s*=?\s*(\d+)/);
  if (compileSdkMatch) {
    const compileSdk = parseInt(compileSdkMatch[1]);
    console.log(`✅ compileSdkVersion: ${compileSdk}`);
    if (compileSdk < 35) {
      console.warn(`⚠️  compileSdkVersion < 35 (actuel: ${compileSdk})`);
      hasWarning = true;
    }
  }
  
  // Vérifier targetSdkVersion
  const targetSdkMatch = buildGradle.match(/targetSdk[Version]?\s*=?\s*(\d+)/);
  if (targetSdkMatch) {
    const targetSdk = parseInt(targetSdkMatch[1]);
    console.log(`✅ targetSdkVersion: ${targetSdk}`);
    if (targetSdk < 35) {
      console.warn(`⚠️  targetSdkVersion < 35 (actuel: ${targetSdk})`);
      hasWarning = true;
    }
  }
} else {
  console.error('❌ build.gradle non trouvé');
  hasError = true;
}

// 6. Vérifier google-services.json
console.log('\n🔥 Vérification Firebase :');
const googleServicesPath = path.join('android', 'app', 'google-services.json');
if (fs.existsSync(googleServicesPath)) {
  const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'));
  if (googleServices.project_info && googleServices.client) {
    console.log('✅ google-services.json présent et valide');
    console.log(`   Project ID: ${googleServices.project_info.project_id}`);
  } else {
    console.error('❌ google-services.json invalide');
    hasError = true;
  }
} else {
  console.error('❌ google-services.json manquant dans android/app/');
  hasError = true;
}

// 7. Afficher le contenu du manifest pour debug
if (fs.existsSync(manifestPath)) {
  console.log('\n📋 Extrait du AndroidManifest.xml (permissions AD) :');
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  const lines = manifest.split('\n');
  let inPermissions = false;
  let relevantLines = [];
  
  lines.forEach(line => {
    if (line.includes('uses-permission') && line.includes('AD_ID')) {
      relevantLines.push(line.trim());
    }
    if (line.includes('AD_SERVICES_CONFIG')) {
      relevantLines.push(line.trim());
    }
  });
  
  if (relevantLines.length > 0) {
    relevantLines.forEach(line => console.log(`   ${line}`));
  } else {
    console.log('   Aucune permission AD trouvée !');
  }
}

// 8. Résumé
console.log('\n📊 RÉSUMÉ :');
if (hasError) {
  console.error('❌ Des erreurs critiques ont été détectées. Corrigez-les avant de lancer le build.');
  process.exit(1);
} else if (hasWarning) {
  console.warn('⚠️  Des avertissements ont été détectés. Le build peut fonctionner mais vérifiez les points ci-dessus.');
} else {
  console.log('✅ Toutes les vérifications sont passées !');
}

console.log('\n💡 CONSEIL : Pour voir les logs détaillés du build qui a échoué :');
console.log('   Allez sur le lien fourni par EAS et cliquez sur "View logs"');
console.log('   Cherchez l\'erreur dans la section "Run gradlew"\n');
