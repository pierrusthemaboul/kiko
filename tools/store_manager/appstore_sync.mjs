#!/usr/bin/env node

/**
 * Script de synchronisation avec l'API Apple App Store Connect v1.
 * 
 * Commandes :
 *   node tools/store_manager/appstore_sync.mjs token
 *   node tools/store_manager/appstore_sync.mjs pull
 *   node tools/store_manager/appstore_sync.mjs push [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, 'credentials/.env') });

const args = process.argv.slice(2);
const command = args[0] || 'help';

// Configuration Apple
const KEY_ID = process.env.APPLE_KEY_ID || 'NRS8XWJ6KU';
const ISSUER_ID = process.env.APPLE_ISSUER_ID || process.env.APP_STORE_CONNECT_ISSUER_ID;
const BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'com.pierretulle.juno2';

function findAppleP8Key() {
  const p8Candidate = path.join(rootDir, `AuthKey_${KEY_ID}.p8`);
  if (fs.existsSync(p8Candidate)) {
    return p8Candidate;
  }
  const rootFiles = fs.readdirSync(rootDir);
  const found = rootFiles.find(f => f.startsWith('AuthKey_') && f.endsWith('.p8'));
  if (found) {
    return path.join(rootDir, found);
  }
  throw new Error('Fichier de clé privée Apple .p8 introuvable.');
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateAppStoreConnectToken() {
  if (!ISSUER_ID) {
    throw new Error("APPLE_ISSUER_ID manquant dans l'environnement. Trouvable sur App Store Connect > Utilisateurs et accès > Clés.");
  }

  const p8Path = findAppleP8Key();
  const privateKey = fs.readFileSync(p8Path, 'utf-8');

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (20 * 60); // Valide 20 minutes

  const header = {
    alg: 'ES256',
    kid: KEY_ID,
    typ: 'JWT',
  };

  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: exp,
    aud: 'appstoreconnect-v1',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('SHA256');
  signer.update(message);
  signer.end();

  const signature = signer.sign({
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  const encodedSignature = base64UrlEncode(signature);
  return `${message}.${encodedSignature}`;
}

async function apiRequest(endpoint, options = {}) {
  const token = generateAppStoreConnectToken();
  const url = `https://api.appstoreconnect.apple.com/v1${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Erreur HTTP App Store Connect (${res.status}): ${errorBody}`);
  }

  return res.json();
}

async function handleToken() {
  console.log('\n🍏 Génération du token JWT App Store Connect...');
  const token = generateAppStoreConnectToken();
  console.log('✅ Token généré avec succès !');
  console.log(`Token (20 min) : ${token.substring(0, 30)}...`);
}

async function handlePull() {
  console.log(`\n🍏 Recherche de l'application ${BUNDLE_ID} sur App Store Connect...`);
  const appsRes = await apiRequest(`/apps?filter[bundleId]=${BUNDLE_ID}`);
  const apps = appsRes.data || [];

  if (apps.length === 0) {
    throw new Error(`Aucune application trouvée pour le bundle ID: ${BUNDLE_ID}`);
  }

  const app = apps[0];
  console.log(`✅ Application trouvée : ${app.attributes.name} (ID: ${app.id})`);
}

async function main() {
  try {
    switch (command) {
      case 'token':
        await handleToken();
        break;
      case 'pull':
        await handlePull();
        break;
      default:
        console.log(`
Usage:
  node tools/store_manager/appstore_sync.mjs token
  node tools/store_manager/appstore_sync.mjs pull
        `);
    }
  } catch (err) {
    console.error('\n❌ Erreur:', err.message);
    process.exit(1);
  }
}

main();
