#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 VÉRIFICATION PRÉ-BUILD ANDROID\n');

let errors = 0;
let warnings = 0;

// 1. Vérifier les assets splash
console.log('📱 Vérification des assets...');
const splashFiles = [
  'assets/images/splash-icon.png',
  'assets/images/splashscreen_logo.png',
  'assets/images/icon.png'
];

splashFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} existe`);
  } else {
    console.log(`❌ ${file} MANQUANT`);
    errors++;
  }
});

// 2. Vérifier app.config.js
console.log('\n⚙️  Vérification app.config.js...');
if (fs.existsSync('app.config.js')) {
  const config = fs.readFileSync('app.config.js', 'utf8');
  
  if (config.includes('targetSdkVersion: 35')) {
    console.log('✅ targetSdkVersion: 35');
  } else {
    console.log('⚠️  targetSdkVersion pas à 35');
    warnings++;
  }
  
  if (config.includes('com.google.android.gms.permission.AD_ID')) {
    console.log('✅ Permission AD_ID déclarée');
  } else {
    console.log('❌ Permission AD_ID MANQUANTE');
    errors++;
  }
} else {
  console.log('❌ app.config.js MANQUANT');
  errors++;
}

// 3. Vérifier google-services.json
console.log('\n🔐 Vérification google-services.json...');
if (fs.existsSync('google-services.json')) {
  console.log('✅ google-services.json existe');
} else {
  console.log('⚠️  google-services.json manquant');
  warnings++;
}

// 4. Vérifier eas.json
console.log('\n🏗️  Vérification eas.json...');
if (fs.existsSync('eas.json')) {
  const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
  
  if (eas.build.production.autoIncrement === false) {
    console.log('✅ autoIncrement: false (correct)');
  } else {
    console.log('⚠️  autoIncrement devrait être false');
    warnings++;
  }
} else {
  console.log('❌ eas.json MANQUANT');
  errors++;
}

// 5. Vérifier les dossiers android générés
console.log('\n📁 Vérification structure Android...');
if (fs.existsSync('android')) {
  console.log('⚠️  Dossier android/ existe (faire clean prebuild)');
  warnings++;
} else {
  console.log('✅ Pas de dossier android/ (clean)');
}

// 6. Vérifier node_modules critiques
console.log('\n📦 Vérification modules critiques...');
const criticalModules = [
  'node_modules/react-native-google-mobile-ads',
  'node_modules/@react-native-firebase',
  'node_modules/expo-router'
];

criticalModules.forEach(mod => {
  if (fs.existsSync(mod)) {
    console.log(`✅ ${path.basename(mod)} installé`);
  } else {
    console.log(`❌ ${path.basename(mod)} MANQUANT`);
    errors++;
  }
});

// RÉSUMÉ
console.log('\n📊 RÉSUMÉ :');
console.log(`❌ Erreurs bloquantes: ${errors}`);
console.log(`⚠️  Avertissements: ${warnings}`);

if (errors > 0) {
  console.log('\n🚫 BUILD BLOQUÉ - Corrigez les erreurs avant de continuer');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️  BUILD POSSIBLE mais avec avertissements');
  process.exit(0);
} else {
  console.log('\n🚀 PRÊT POUR LE BUILD !');
  process.exit(0);
}
