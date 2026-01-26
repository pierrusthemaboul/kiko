#!/usr/bin/env node

/**
 * Fetch Metadata - Récupération des métadonnées depuis le téléphone
 *
 * Ce script récupère les fichiers de métadonnées générés par l'app React Native
 * via ADB depuis le téléphone vers le dossier ASSETS_RAW.
 *
 * @version 1.0.0
 * @date 2026-01-13
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const sessionId = process.argv[2];
const appPackage = 'com.pierretulle.juno2.dev'; // Package de l'app de dev

if (!sessionId) {
  console.log(`
📱 FETCH METADATA - Récupération depuis le téléphone

USAGE:
  node fetch_metadata.js <session_id>

EXEMPLE:
  node fetch_metadata.js session_1768314915411

OPTIONS:
  --list    Lister toutes les sessions disponibles sur le téléphone
  --latest  Récupérer la session la plus récente
  --all     Récupérer toutes les sessions disponibles

EXEMPLES:
  node fetch_metadata.js --list
  node fetch_metadata.js --latest
  node fetch_metadata.js --all
  `);
  process.exit(0);
}

const ASSETS_RAW_DIR = path.join(__dirname, './STORAGE/OUTPUT');
if (!fs.existsSync(ASSETS_RAW_DIR)) {
  fs.mkdirSync(ASSETS_RAW_DIR, { recursive: true });
}

console.log('📱 FETCH METADATA - Récupération depuis le téléphone');
console.log('═'.repeat(60));

// Vérifier qu'ADB est disponible
try {
  execSync('adb version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ ERREUR : ADB n\'est pas installé ou non accessible.');
  console.error('   Installation : sudo apt install android-tools-adb (Linux)');
  console.error('   ou : brew install android-platform-tools (Mac)');
  process.exit(1);
}

// Vérifier qu'un téléphone est connecté
try {
  const devices = execSync('adb devices', { encoding: 'utf8' });
  if (!devices.includes('device')) {
    console.error('❌ ERREUR : Aucun téléphone connecté.');
    console.error('   Branchez votre téléphone et activez le débogage USB.');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ ERREUR : Impossible de vérifier les appareils connectés.');
  process.exit(1);
}

// Chemins sur le téléphone (via run-as pour accéder aux fichiers privés de l'app)
const REMOTE_FILES_PATH = 'files/game_sessions';

/**
 * Liste toutes les sessions disponibles sur le téléphone
 */
function listSessions() {
  console.log('\n📋 Sessions disponibles sur le téléphone:\n');

  try {
    const output = execSync(`adb shell "run-as ${appPackage} ls -lh ${REMOTE_FILES_PATH}/"`, {
      encoding: 'utf8',
    });

    const lines = output.split('\n').filter(line => line.includes('session_'));

    if (lines.length === 0) {
      console.log('   Aucune session trouvée.');
      return [];
    }

    const sessions = new Set();
    lines.forEach(line => {
      const match = line.match(/session_\d+_\d+/);
      if (match) {
        sessions.add(match[0]);
      }
    });

    sessions.forEach(sessionId => {
      console.log(`   📄 ${sessionId}`);
    });

    console.log(`\n   Total : ${sessions.size} sessions`);
    return Array.from(sessions);
  } catch (error) {
    console.error('❌ ERREUR : Impossible de lister les sessions.');
    console.error(`   Vérifiez que l'app a généré des métadonnées.`);
    console.error(`   Package: ${appPackage}`);
    return [];
  }
}

/**
 * Récupère une session spécifique
 */
function fetchSession(sessionId) {
  console.log(`\n🔍 Récupération de la session: ${sessionId}`);

  const jsonFile = `${sessionId}_metadata.json`;
  const txtFile = `${sessionId}_metadata.txt`;

  const localJson = path.join(ASSETS_RAW_DIR, jsonFile);
  const localTxt = path.join(ASSETS_RAW_DIR, txtFile);

  let successCount = 0;

  // Récupérer le JSON via run-as + cat
  try {
    const jsonContent = execSync(
      `adb shell "run-as ${appPackage} cat ${REMOTE_FILES_PATH}/${jsonFile}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    fs.writeFileSync(localJson, jsonContent);
    console.log(`   ✅ JSON récupéré : ${jsonFile}`);
    successCount++;
  } catch (error) {
    console.error(`   ❌ Échec JSON : ${jsonFile}`);
  }

  // Récupérer le TXT via run-as + cat
  try {
    const txtContent = execSync(
      `adb shell "run-as ${appPackage} cat ${REMOTE_FILES_PATH}/${txtFile}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    );
    fs.writeFileSync(localTxt, txtContent);
    console.log(`   ✅ TXT récupéré : ${txtFile}`);
    successCount++;
  } catch (error) {
    console.error(`   ⚠️  TXT introuvable (optionnel) : ${txtFile}`);
  }

  if (successCount > 0) {
    console.log(`\n✅ Session récupérée avec succès !`);
    console.log(`   📁 Fichiers dans: ${ASSETS_RAW_DIR}`);

    // Afficher un aperçu des métadonnées
    if (fs.existsSync(localJson)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(localJson, 'utf8'));
        console.log(`\n📊 Aperçu des métadonnées:`);
        console.log(`   Mode : ${metadata.mode}`);
        console.log(`   Joueur : ${metadata.user_name}`);
        console.log(`   Résultat : ${metadata.resultat?.toUpperCase() || 'EN COURS'}`);
        console.log(`   Score : ${metadata.score_final || metadata.score_initial}`);
        console.log(`   Événements : ${metadata.total_events}`);
        console.log(`   Précision : ${metadata.accuracy_percent || 0}%`);
        console.log(`   Durée : ${metadata.duration_seconds || 0}s`);
      } catch (parseError) {
        console.warn('   ⚠️  Impossible de parser le JSON');
      }
    }

    return true;
  } else {
    console.error(`\n❌ Échec de la récupération de la session.`);
    return false;
  }
}

/**
 * Récupère la session la plus récente
 */
function fetchLatest() {
  console.log('\n🔍 Recherche de la session la plus récente...');

  const sessions = listSessions();
  if (sessions.length === 0) {
    console.error('❌ Aucune session disponible.');
    return false;
  }

  // Trier par timestamp (format: session_TIMESTAMP_RANDOM)
  const sortedSessions = sessions.sort((a, b) => {
    const timestampA = parseInt(a.split('_')[1]);
    const timestampB = parseInt(b.split('_')[1]);
    return timestampB - timestampA;
  });

  const latestSession = sortedSessions[0];
  console.log(`\n📌 Session la plus récente: ${latestSession}`);

  return fetchSession(latestSession);
}

/**
 * Récupère toutes les sessions
 */
function fetchAll() {
  console.log('\n📦 Récupération de toutes les sessions...');

  const sessions = listSessions();
  if (sessions.length === 0) {
    console.error('❌ Aucune session disponible.');
    return false;
  }

  let successCount = 0;
  sessions.forEach((sessionId, index) => {
    console.log(`\n[${index + 1}/${sessions.length}] ${sessionId}`);
    if (fetchSession(sessionId)) {
      successCount++;
    }
  });

  console.log(`\n✅ ${successCount}/${sessions.length} sessions récupérées.`);
  return successCount > 0;
}

// Traitement des arguments
if (sessionId === '--list') {
  listSessions();
} else if (sessionId === '--latest') {
  fetchLatest();
} else if (sessionId === '--all') {
  fetchAll();
} else {
  // Session spécifique
  fetchSession(sessionId);
}

console.log('\n═'.repeat(60));
console.log('📋 PROCHAINES ÉTAPES:');
console.log('');
console.log('1. Vérifier les métadonnées récupérées:');
console.log(`   cat ${path.join(ASSETS_RAW_DIR, sessionId)}_metadata.txt`);
console.log('');
console.log('2. Découper la vidéo avec les métadonnées:');
console.log(`   node derush_clipper_v2.js \\`);
console.log(`     ../ASSETS_RAW/raw_gameplay_${sessionId}.mp4 \\`);
console.log(`     ../ASSETS_RAW/${sessionId}_metadata.json`);
console.log('');
console.log('3. Livrer à K-Hive:');
console.log('   cp OUTPUTS/clips/* ../DATA_OUTBOX/TO_K_HIVE/DELIVERY_XXX/');
console.log('');
