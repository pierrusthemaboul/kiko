#!/usr/bin/env node

/**
 * Script de diagnostic pour l'authentification TikTok OAuth2
 * Permet de tester l'URL d'autorisation et identifier les problèmes de configuration
 */

import { readFileSync } from 'fs';
import { createHash, randomBytes } from 'crypto';

// Chargement des identifiants
const credentials = JSON.parse(readFileSync('tiktok-credentials.json', 'utf-8'));

const {
  clientKey,
  clientSecret,
  appId
} = credentials;

// Configuration OAuth2
// IMPORTANT: La Redirect URI DOIT se terminer par un slash / selon la documentation TikTok
const REDIRECT_URI = 'https://pierrusthemaboul.github.io/kiko/auth/callback/';
const SCOPES = 'user.info.basic,user.info.profile,user.info.stats,video.list';
const STATE = randomBytes(16).toString('hex');

// Génération du code challenge PKCE
function generatePKCE() {
  const codeVerifier = randomBytes(32).toString('base64url');
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

const { codeVerifier, codeChallenge } = generatePKCE();

// Construction de l'URL d'autorisation TikTok
const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
authUrl.searchParams.append('client_key', clientKey);
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('scope', SCOPES);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('state', STATE);
authUrl.searchParams.append('code_challenge', codeChallenge);
authUrl.searchParams.append('code_challenge_method', 'S256');

console.log('=== DIAGNOSTIC TIKTOK OAUTH2 ===\n');
console.log('Identifiants chargés:');
console.log(`- Client Key: ${clientKey}`);
console.log(`- App ID: ${appId}`);
console.log(`- Client Secret: ${clientSecret.substring(0, 10)}... (masqué)\n`);

console.log('Configuration OAuth2:');
console.log(`- Redirect URI: ${REDIRECT_URI}`);
console.log(`- Scopes: ${SCOPES}`);
console.log(`- State: ${STATE}`);
console.log(`- Code Challenge: ${codeChallenge}`);
console.log(`- Code Verifier: ${codeVerifier}\n`);

console.log('=== URL D\'AUTORISATION ===\n');
console.log(authUrl.toString());
console.log('\n=== FIN DU DIAGNOSTIC ===\n');

console.log('Instructions:');
console.log('1. Copiez l\'URL ci-dessus et ouvrez-la dans un navigateur');
console.log('2. Si vous obtenez une erreur "client_key", vérifiez:');
console.log('   - Que le Client Key est correct dans la console développeur TikTok');
console.log('   - Que l\'application est en statut "Draft" ou "Live" (pas "Rejected")');
console.log('   - Que le Login Kit est activé dans les produits de l\'application');
console.log('   - Que la Redirect URI correspond exactement à celle enregistrée');
console.log('3. Si l\'autorisation fonctionne, vous serez redirigé vers votre Redirect URI avec un code d\'autorisation');
console.log('4. Copiez ce code pour l\'étape suivante (échange de tokens)\n');

// Sauvegarde du code verifier pour l'étape suivante
import { writeFileSync } from 'fs';
writeFileSync('tiktok-pkce-temp.json', JSON.stringify({
  codeVerifier,
  state: STATE,
  redirectUri: REDIRECT_URI
}, null, 2));
console.log('Code verifier sauvegardé dans tiktok-pkce-temp.json pour l\'étape suivante');
