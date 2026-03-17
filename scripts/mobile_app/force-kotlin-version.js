const fs = require('fs');
const path = require('path');

console.log('\n🔧 FORCE KOTLIN VERSION 1.9.25\n');

let modified = false;

// 1. Modifier gradle.properties
const gradlePropertiesPath = path.join('android', 'gradle.properties');
if (fs.existsSync(gradlePropertiesPath)) {
  let content = fs.readFileSync(gradlePropertiesPath, 'utf8');
  
  // Forcer Kotlin version
  if (!content.includes('kotlinVersion=')) {
    content += '\n# Force Kotlin version for Compose compatibility\nkotlinVersion=1.9.25\n';
    modified = true;
  } else {
    content = content.replace(/kotlinVersion=.*/g, 'kotlinVersion=1.9.25');
    modified = true;
  }
  
  // Ajouter les propriétés JVM si nécessaire
  if (!content.includes('org.gradle.jvmargs=')) {
    content += '\n# JVM memory settings\norg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8\n';
  }
  
  // Ajouter les propriétés AndroidX
  if (!content.includes('android.useAndroidX=')) {
    content += '\nandroid.useAndroidX=true\n';
  }
  if (!content.includes('android.enableJetifier=')) {
    content += 'android.enableJetifier=true\n';
  }
  
  fs.writeFileSync(gradlePropertiesPath, content);
  console.log('✅ gradle.properties mis à jour avec kotlinVersion=1.9.25');
}

// 2. Modifier build.gradle (root)
const rootBuildGradlePath = path.join('android', 'build.gradle');
if (fs.existsSync(rootBuildGradlePath)) {
  let content = fs.readFileSync(rootBuildGradlePath, 'utf8');
  
  // Vérifier si ext.kotlinVersion est défini
  if (!content.includes('ext.kotlinVersion')) {
    // Ajouter dans le bloc buildscript
    content = content.replace(
      /buildscript\s*{/,
      `buildscript {
    ext {
        kotlinVersion = "1.9.25"
    }`
    );
    modified = true;
  } else {
    // Remplacer la version existante
    content = content.replace(/kotlinVersion\s*=\s*["'][\d.]+["']/g, 'kotlinVersion = "1.9.25"');
    modified = true;
  }
  
  // S'assurer que la dépendance Kotlin est présente
  if (!content.includes('kotlin-gradle-plugin')) {
    content = content.replace(
      /dependencies\s*{/,
      `dependencies {
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:\$kotlinVersion")`
    );
    modified = true;
  }
  
  fs.writeFileSync(rootBuildGradlePath, content);
  console.log('✅ build.gradle (root) mis à jour');
}

// 3. Créer/modifier local.properties pour forcer les versions
const localPropertiesPath = path.join('android', 'local.properties');
let localContent = '';
if (fs.existsSync(localPropertiesPath)) {
  localContent = fs.readFileSync(localPropertiesPath, 'utf8');
}

// Ajouter la version Kotlin si elle n'existe pas
if (!localContent.includes('kotlin.version=')) {
  localContent += '\n# Force Kotlin version\nkotlin.version=1.9.25\n';
  fs.writeFileSync(localPropertiesPath, localContent);
  console.log('✅ local.properties mis à jour');
  modified = true;
}

// 4. Copier google-services.json si nécessaire
const rootGoogleServices = path.join('google-services.json');
const androidGoogleServices = path.join('android', 'app', 'google-services.json');
if (fs.existsSync(rootGoogleServices) && !fs.existsSync(androidGoogleServices)) {
  fs.copyFileSync(rootGoogleServices, androidGoogleServices);
  console.log('✅ google-services.json copié dans android/app/');
}

// 5. Afficher les instructions finales
console.log('\n📝 INSTRUCTIONS FINALES :');
console.log('1. Nettoyez le cache Gradle :');
console.log('   cd android && ./gradlew clean && cd ..');
console.log('2. Relancez le prebuild :');
console.log('   npx expo prebuild --platform android --clean');
console.log('3. Vérifiez avec le diagnostic :');
console.log('   node scripts/diagnostic-prebuild.js');
console.log('4. Lancez le build :');
console.log('   eas build --platform android --profile production --clear-cache\n');

if (modified) {
  console.log('✅ Modifications appliquées avec succès !');
} else {
  console.log('⚠️  Aucune modification nécessaire');
}
