#!/usr/bin/env node

/**
 * Script de gestion et synchronisation Google Play Store via l'API Android Publisher v3.
 * 
 * Commandes :
 *   node tools/store_manager/playstore_sync.mjs pull [--package=com.pierretulle.juno2]
 *   node tools/store_manager/playstore_sync.mjs push [--dry-run] [--package=com.pierretulle.juno2]
 *   node tools/store_manager/playstore_sync.mjs reviews [--max=10] [--package=com.pierretulle.juno2]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Charger les variables d'environnement
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, 'credentials/.env') });

// Détection des arguments CLI
const args = process.argv.slice(2);
const command = args[0] || 'help';

function getArgValue(prefix, defaultValue) {
  const match = args.find(a => a.startsWith(prefix));
  return match ? match.split('=')[1] : defaultValue;
}

const isDryRun = args.includes('--dry-run');
const packageName = getArgValue('--package=', process.env.PLAY_STORE_PACKAGE_NAME || 'com.pierretulle.juno2');

// Détection de la clé de compte de service Google
function findServiceAccountKey() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const candidateKeys = [
    path.join(rootDir, 'kiko-chrono-c28384984e64.json'),
    path.join(rootDir, 'kiko-chrono-d02fc8cffcf6.json'),
    path.join(rootDir, 'kiko-chrono-e34241a84e41.json'),
  ];
  for (const keyPath of candidateKeys) {
    if (fs.existsSync(keyPath)) {
      return keyPath;
    }
  }
  throw new Error('Aucune clé de compte de service Google Play trouvée.');
}

async function getPublisherClient() {
  const keyFilePath = findServiceAccountKey();
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return google.androidpublisher({ version: 'v3', auth });
}

// 1. PULL : Récupération des fiches en ligne
async function handlePull() {
  console.log(`\n📥 Récupération des fiches pour le package: ${packageName}...`);
  const publisher = await getPublisherClient();

  const editRes = await publisher.edits.insert({
    packageName,
  });
  const editId = editRes.data.id;

  try {
    const listingsRes = await publisher.edits.listings.list({
      packageName,
      editId,
    });

    const listings = listingsRes.data.listings || [];
    console.log(`\n✅ ${listings.length} fiche(s) linguistique(s) trouvée(s) :`);

    for (const listing of listings) {
      console.log(`\n--- [Langue: ${listing.language}] ---`);
      console.log(`Titre : ${listing.title}`);
      console.log(`Description courte : ${listing.shortDescription}`);
      console.log(`Description longue (${listing.fullDescription?.length || 0} car.) :\n${listing.fullDescription?.slice(0, 150)}...\n`);
      
      const backupDir = path.join(__dirname, 'metadata', listing.language);
      fs.mkdirSync(backupDir, { recursive: true });
      fs.writeFileSync(path.join(backupDir, 'current_title.txt'), listing.title || '');
      fs.writeFileSync(path.join(backupDir, 'current_short_description.txt'), listing.shortDescription || '');
      fs.writeFileSync(path.join(backupDir, 'current_full_description.txt'), listing.fullDescription || '');
      console.log(`💾 Sauvegardé dans ${path.relative(rootDir, backupDir)}`);
    }
  } finally {
    await publisher.edits.delete({ packageName, editId }).catch(() => {});
  }
}

// 2. PUSH : Mise à jour des fiches depuis metadata/
async function handlePush() {
  console.log(`\n📤 Préparation de la mise à jour des fiches pour: ${packageName}...`);
  if (isDryRun) {
    console.log('🔍 MODE DRY-RUN ACTIF (aucune modification ne sera envoyée sur le Play Store).');
  }

  const metadataDir = path.join(__dirname, 'metadata');
  if (!fs.existsSync(metadataDir)) {
    throw new Error(`Dossier metadata introuvable: ${metadataDir}`);
  }

  const locales = fs.readdirSync(metadataDir).filter(f => fs.statSync(path.join(metadataDir, f)).isDirectory());
  if (locales.length === 0) {
    throw new Error('Aucun dossier de langue trouvé dans tools/store_manager/metadata/');
  }

  // Validation préalable
  const payloadByLocale = {};
  for (const locale of locales) {
    const locDir = path.join(metadataDir, locale);
    const titleFile = path.join(locDir, 'title.txt');
    const shortDescFile = path.join(locDir, 'short_description.txt');
    const fullDescFile = path.join(locDir, 'full_description.txt');

    if (!fs.existsSync(titleFile) || !fs.existsSync(shortDescFile) || !fs.existsSync(fullDescFile)) {
      console.warn(`⚠️ Dossier ${locale} incomplet (fichiers title.txt, short_description.txt, full_description.txt requis). Ignoré.`);
      continue;
    }

    const title = fs.readFileSync(titleFile, 'utf-8').trim();
    const shortDescription = fs.readFileSync(shortDescFile, 'utf-8').trim();
    const fullDescription = fs.readFileSync(fullDescFile, 'utf-8').trim();

    // Vérification des quotas Google Play
    if (title.length > 30) {
      throw new Error(`[${locale}] Le titre dépasse 30 caractères (${title.length} car.): "${title}"`);
    }
    if (shortDescription.length > 80) {
      throw new Error(`[${locale}] La description courte dépasse 80 caractères (${shortDescription.length} car.): "${shortDescription}"`);
    }
    if (fullDescription.length > 4000) {
      throw new Error(`[${locale}] La description longue dépasse 4000 caractères (${fullDescription.length} car.)`);
    }

    payloadByLocale[locale] = { title, shortDescription, fullDescription };
    console.log(`\n✅ [${locale}] Fiche validée :`);
    console.log(`  - Titre (${title.length}/30) : "${title}"`);
    console.log(`  - Courte (${shortDescription.length}/80) : "${shortDescription}"`);
    console.log(`  - Longue (${fullDescription.length}/4000 car.)`);
  }

  if (isDryRun) {
    console.log('\n✨ Validation réussie en mode dry-run !');
    return;
  }

  const publisher = await getPublisherClient();
  const editRes = await publisher.edits.insert({ packageName });
  const editId = editRes.data.id;
  console.log(`\n🔄 Edit session créée : ${editId}`);

  try {
    for (const [locale, data] of Object.entries(payloadByLocale)) {
      console.log(`\n🚀 Envoi de la fiche [${locale}]...`);
      await publisher.edits.listings.patch({
        packageName,
        editId,
        language: locale,
        requestBody: data,
      });
      console.log(`✅ Fiche [${locale}] mise à jour avec succès dans l'edit.`);
    }

    console.log('\n📦 Enregistrement (commit) des modifications...');
    await publisher.edits.commit({
      packageName,
      editId,
    });
    console.log('🎉 Modfications publiées avec succès sur Google Play Console !');
  } catch (err) {
    console.error('❌ Erreur lors de la publication, annulation de la session edit...', err.message);
    await publisher.edits.delete({ packageName, editId }).catch(() => {});
    throw err;
  }
}

// 3. REVIEWS : Lecture des derniers avis
async function handleReviews() {
  const max = parseInt(getArgValue('--max=', '10'), 10);
  console.log(`\n💬 Récupération des ${max} derniers avis pour ${packageName}...`);
  const publisher = await getPublisherClient();

  const res = await publisher.reviews.list({
    packageName,
    maxResults: max,
  });

  const reviews = res.data.reviews || [];
  if (reviews.length === 0) {
    console.log('Aucun avis trouvé.');
    return;
  }

  console.log(`\n⭐ ${reviews.length} avis reçus :\n`);
  for (const r of reviews) {
    const comment = r.comments?.[0]?.userComment;
    if (comment) {
      console.log(`[Note: ${comment.starRating}★] ${r.authorName} (${new Date(parseInt(comment.lastModified.seconds, 10) * 1000).toLocaleDateString()}):`);
      console.log(`"${comment.text?.trim()}"\n`);
    }
  }
}

async function main() {
  try {
    switch (command) {
      case 'pull':
        await handlePull();
        break;
      case 'push':
        await handlePush();
        break;
      case 'reviews':
        await handleReviews();
        break;
      default:
        console.log(`
Usage:
  node tools/store_manager/playstore_sync.mjs pull [--package=...]
  node tools/store_manager/playstore_sync.mjs push [--dry-run] [--package=...]
  node tools/store_manager/playstore_sync.mjs reviews [--max=10] [--package=...]
        `);
    }
  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  }
}

main();
