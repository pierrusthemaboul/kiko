// Script one-shot : flux OAuth "installed app" pour l'API AdMob.
// Ouvre une URL de consentement, capture le code sur http://127.0.0.1:8484,
// échange le code contre un refresh token et le sauvegarde dans admob-oauth-token.json
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const CLIENT_SECRET_PATH = path.join(__dirname, '..', '..', 'client_secret_133980803682-uit4qnqfbt762o4ibnmn6qrb87f862aq.apps.googleusercontent.com.json');
const TOKEN_PATH = path.join(__dirname, '..', '..', 'admob-oauth-token.json');
const PORT = 8484;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/admob.readonly';

const creds = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8')).installed;

const authUrl = `${creds.auth_uri}?` + new URLSearchParams({
  client_id: creds.client_id,
  redirect_uri: REDIRECT_URI,
  response_type: 'code',
  scope: SCOPE,
  access_type: 'offline',
  prompt: 'consent',
}).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.end('Erreur: ' + error);
    console.error('AUTH ERROR:', error);
    process.exit(1);
  }
  if (!code) {
    res.end('En attente du code...');
    return;
  }

  res.end('OK - tu peux fermer cet onglet.');
  console.log('CODE RECU, echange en cours...');
  server.close();

  const tokenRes = await fetch(creds.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    console.error('TOKEN ERROR:', JSON.stringify(tokens));
    process.exit(1);
  }
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log('TOKEN SAUVEGARDE:', TOKEN_PATH);
  console.log('refresh_token present:', !!tokens.refresh_token);

  // Vérif rapide : lister les comptes AdMob
  const acc = await fetch('https://admob.googleapis.com/v1/accounts', {
    headers: { Authorization: 'Bearer ' + tokens.access_token },
  });
  console.log('ADMOB STATUS', acc.status);
  console.log((await acc.text()).slice(0, 2000));
  process.exit(0);
});

server.listen(PORT, 'localhost', () => {
  console.log('En ecoute sur ' + REDIRECT_URI);
  console.log('\nOUVRE CETTE URL DANS TON NAVIGATEUR:\n');
  console.log(authUrl);
  try { exec(`start "" "${authUrl}"`); } catch { }
});
