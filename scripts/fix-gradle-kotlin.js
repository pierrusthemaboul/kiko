const fs = require('fs');
const path = require('path');

console.log('\n🔧 FIX AUTOMATIQUE DES PROBLÈMES GRADLE/KOTLIN\n');

// 1. Fixer gradle.properties
const gradlePropertiesPath = path.join('android', 'gradle.properties');
if (fs.existsSync(gradlePropertiesPath)) {
  let content = fs.readFileSync(gradlePropertiesPath, 'utf8');
  
  // Forcer Kotlin 1.9.25
  if (!content.includes('kotlinVersion=')) {
    content += '\n# Force Kotlin version\nkotlinVersion=1.9.25\n';
  } else {
    content = content.replace(/kotlinVersion=.*/g, 'kotlinVersion=1.9.25');
  }
  
  // Ajouter JVM args si nécessaire
  if (!content.includes('org.gradle.jvmargs=')) {
    content += '\n# JVM memory settings\norg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8\n';
  }
  
  // Ajouter autres propriétés utiles
  if (!content.includes('android.useAndroidX=')) {
    content += '\nandroid.useAndroidX=true\n';
  }
  if (!content.includes('android.enableJetifier=')) {
    content += 'android.enableJetifier=true\n';
  }
  
  fs.writeFileSync(gradlePropertiesPath, content);
  console.log('✅ gradle.properties mis à jour');
}

// 2. Copier google-services.json si nécessaire
const rootGoogleServices = path.join('google-services.json');
const androidGoogleServices = path.join('android', 'app', 'google-services.json');
if (fs.existsSync(rootGoogleServices) && !fs.existsSync(androidGoogleServices)) {
  fs.copyFileSync(rootGoogleServices, androidGoogleServices);
  console.log('✅ google-services.json copié dans android/app/');
}

// 3. Fixer build.gradle (root)
const rootBuildGradlePath = path.join('android', 'build.gradle');
if (fs.existsSync(rootBuildGradlePath)) {
  let content = fs.readFileSync(rootBuildGradlePath, 'utf8');
  
  // S'assurer que Kotlin est dans le buildscript
  if (!content.includes('kotlin-gradle-plugin')) {
    content = content.replace(
      /buildscript\s*{[^}]*dependencies\s*{/,
      `buildscript {
    dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:\$kotlinVersion")`
    );
    console.log('✅ Kotlin gradle plugin ajouté');
  }
  
  fs.writeFileSync(rootBuildGradlePath, content);
}

// 4. Vérifier/créer le dossier XML si nécessaire
const xmlDir = path.join('android', 'app', 'src', 'main', 'res', 'xml');
if (!fs.existsSync(xmlDir)) {
  fs.mkdirSync(xmlDir, { recursive: true });
  console.log('✅ Dossier XML créé');
}

// 5. Afficher les recommandations
console.log('\n📝 RECOMMANDATIONS :');
console.log('1. Vérifiez les logs détaillés du build sur le lien EAS fourni');
console.log('2. Dans les logs, cherchez la section "Run gradlew" pour l\'erreur exacte');
console.log('3. Les erreurs communes incluent :');
console.log('   - Version de Kotlin incompatible');
console.log('   - Dépendances manquantes');
console.log('   - Problèmes de mémoire (OutOfMemoryError)');
console.log('   - Conflits de versions de bibliothèques\n');