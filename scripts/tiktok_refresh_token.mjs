#!/usr/bin/env node

/**
 * Script de rafraîchissement du token d'accès TikTok
 * Utilise le refresh_token pour obtenir un nouvel access_token
 */

import { readFileSync, writeFileSync } from 'fs';
import fetch from 'node-fetch';

// Chargement des identifiants et tokens
const credentials = JSON.parse(readFileSync('tiktok-credentials.json', 'utf-8'));
const tokens = JSON.parse(readFileSync('tiktok-tokens.json', 'utf-8'));

const {
  clientKey,
  clientSecret
} = credentials;

const {
  refresh_token,
  refresh_expires_at
} = tokens;

// Vérification de l'expiration du refresh token
if (refresh_expires_at && Date.now() > refresh_expires_at) {
  console.error('Erreur: Le refresh token a expiré');
  console.log('Veuillez relancer le flux OAuth2 complet');
  process.exit(1);
}

if (!refresh_token) {
  console.error('Erreur: Aucun refresh token disponible');
  console.log('Veuillez relancer le flux OAuth2 complet');
  process.exit(1);
}

console.log('=== RAFRAÎCHISSEMENT DU TOKEN TIKTOK ===\n');

// Préparation de la requête refresh
const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';

const params = new URLSearchParams();
params.append('client_key', clientKey);
params.append('client_secret', clientSecret);
params.append('grant_type', 'refresh_token');
params.append('refresh_token', refresh_token);

console.log('Envoi de la requête de refresh à TikTok...');
console.log(`- Refresh Token: ${refresh_token.substring(0, 20)}...`);

try {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  const data = await response.json();

  console.log('\nRéponse TikTok:');
  console.log(JSON.stringify(data, null, 2));

  if (data.error) {
    console.error('\nErreur lors du rafraîchissement du token:');
    console.error(`- Code: ${data.error}`);
    console.error(`- Message: ${data.error_description}`);
    process.exit(1);
  }

  if (data.access_token) {
    console.log('\n=== SUCCÈS ===\n');
    console.log('Nouveau token reçu avec succès!');
    console.log(`- Access Token: ${data.access_token.substring(0, 20)}...`);
    console.log(`- Expires In: ${data.expires_in} secondes`);
    
    if (data.refresh_token) {
      console.log(`- Refresh Token: ${data.refresh_token.substring(0, 20)}...`);
    }

    // Mise à jour des tokens
    const tokensData = {
      ...tokens,
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      expires_at: Date.now() + (data.expires_in * 1000),
      refresh_token: data.refresh_token || refresh_token,
      refresh_expires_in: data.refresh_expires_in,
      refresh_expires_at: data.refresh_expires_in ? Date.now() + (data.refresh_expires_in * 1000) : refresh_expires_at,
      refreshed_at: new Date().toISOString()
    };

    writeFileSync('tiktok-tokens.json', JSON.stringify(tokensData, null, 2));
    console.log('\nTokens mis à jour dans tiktok-tokens.json');
  }

} catch (error) {
  console.error('\nErreur lors de la requête:', error.message);
  process.exit(1);
}
