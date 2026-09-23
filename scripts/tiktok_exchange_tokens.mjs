#!/usr/bin/env node

/**
 * Script d'échange du code d'autorisation contre des tokens d'accès TikTok
 * Utilise PKCE (Proof Key for Code Exchange) pour la sécurité
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import fetch from 'node-fetch';

// Chargement des identifiants
const credentials = JSON.parse(readFileSync('tiktok-credentials.json', 'utf-8'));
const pkceData = JSON.parse(readFileSync('tiktok-pkce-temp.json', 'utf-8'));

const {
  clientKey,
  clientSecret
} = credentials;

const {
  codeVerifier,
  redirectUri
} = pkceData;

// IMPORTANT: La Redirect URI doit se terminer par un slash selon la documentation TikTok
const correctedRedirectUri = redirectUri.endsWith('/') ? redirectUri : redirectUri + '/';

// Récupération du code d'autorisation depuis la ligne de commande
const authCode = process.argv[2];

if (!authCode) {
  console.error('Erreur: Code d\'autorisation manquant');
  console.log('Usage: node scripts/tiktok_exchange_tokens.mjs <code_d_autorisation>');
  console.log('\nLe code d\'autorisation se trouve dans l\'URL de redirection après l\'authentification:');
  console.log('Exemple: https://pierrusthemaboul.github.io/kiko/auth/callback?code=XXXXX&state=YYYYY');
  process.exit(1);
}

console.log('=== ÉCHANGE DE CODE D\'AUTORISATION TIKTOK ===\n');

// Préparation de la requête token
const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';

const params = new URLSearchParams();
params.append('client_key', clientKey);
params.append('client_secret', clientSecret);
params.append('code', authCode);
params.append('grant_type', 'authorization_code');
params.append('redirect_uri', correctedRedirectUri);
params.append('code_verifier', codeVerifier);

console.log('Envoi de la requête à TikTok...');
console.log(`- URL: ${tokenUrl}`);
console.log(`- Grant Type: authorization_code`);
console.log(`- Redirect URI: ${redirectUri}\n`);

try {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const data = await response.json();

  console.log('Réponse TikTok:');
  console.log(JSON.stringify(data, null, 2));

  if (data.error) {
    console.error('\nErreur lors de l\'échange de tokens:');
    console.error(`- Code: ${data.error}`);
    console.error(`- Message: ${data.error_description}`);
    console.error('\nCauses possibles:');
    console.error('- Code d\'autorisation expiré ou déjà utilisé');
    console.error('- Redirect URI incorrecte');
    console.error('- Code verifier incorrect');
    console.error('- Client key/secret incorrects');
    process.exit(1);
  }

  if (data.access_token) {
    console.log('\n=== SUCCÈS ===\n');
    console.log('Tokens reçus avec succès!');
    console.log(`- Access Token: ${data.access_token.substring(0, 20)}...`);
    console.log(`- Token Type: ${data.token_type}`);
    console.log(`- Expires In: ${data.expires_in} secondes`);
    console.log(`- Refresh Token: ${data.refresh_token ? data.refresh_token.substring(0, 20) + '...' : 'N/A'}`);
    
    if (data.refresh_expires_in) {
      console.log(`- Refresh Expires In: ${data.refresh_expires_in} secondes`);
    }

    // Sauvegarde des tokens
    const tokensData = {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000),
      refresh_token: data.refresh_token,
      refresh_expires_in: data.refresh_expires_in,
      refresh_expires_at: data.refresh_expires_in ? Date.now() + (data.refresh_expires_in * 1000) : null,
      scope: data.scope,
      obtained_at: new Date().toISOString()
    };

    writeFileSync('tiktok-tokens.json', JSON.stringify(tokensData, null, 2));
    console.log('\nTokens sauvegardés dans tiktok-tokens.json');
    
    // Nettoyage du fichier temporaire PKCE
    unlinkSync('tiktok-pkce-temp.json');
    console.log('Fichier temporaire tiktok-pkce-temp.json supprimé');
  }

} catch (error) {
  console.error('\nErreur lors de la requête:', error.message);
  process.exit(1);
}
