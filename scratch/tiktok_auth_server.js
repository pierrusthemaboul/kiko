const fs = require('fs');
const path = require('path');
const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

const CREDENTIALS_PATH = path.join(__dirname, '..', 'tiktok-credentials.json');
const TOKENS_PATH = path.join(__dirname, '..', 'tiktok-tokens.json');

// Load credentials
if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error(`❌ Credentials file not found at ${CREDENTIALS_PATH}`);
  process.exit(1);
}
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const CLIENT_KEY = credentials.clientKey;
const CLIENT_SECRET = credentials.clientSecret;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Keep the verifier in memory for the single auth session
let activeCodeVerifier = '';

app.get('/', (req, res) => {
  // 1. Generate PKCE verifier and challenge
  activeCodeVerifier = base64url(crypto.randomBytes(32));
  const hash = crypto.createHash('sha256').update(activeCodeVerifier).digest();
  const codeChallenge = base64url(hash);

  // TikTok authorization URL
  const scopes = 'user.info.basic,video.list';
  const state = Math.random().toString(36).substring(2);
  
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.append('client_key', CLIENT_KEY);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  console.log(`Generating login flow. Code verifier: ${activeCodeVerifier}`);

  res.send(`
    <html>
      <head>
        <title>TikTok OAuth Link (PKCE)</title>
        <style>
          body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f7f7f7; color: #333; }
          a { background-color: #fe2c55; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.1em; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: background-color 0.2s; }
          a:hover { background-color: #e02447; }
          h1 { margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <h1>TikTok Analytics Auth (avec PKCE)</h1>
        <p>Cliquez sur le bouton ci-dessous pour connecter votre compte TikTok.</p>
        <a href="${authUrl.toString()}">Se connecter avec TikTok</a>
      </body>
    </html>
  `);
});

app.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`Erreur TikTok : ${error_description || error}`);
  }

  if (!code) {
    return res.status(400).send('Code de vérification manquant.');
  }

  if (!activeCodeVerifier) {
    return res.status(400).send('Session expirée ou code verifier absent. Veuillez recommencer à la racine http://localhost:3000');
  }

  console.log('🔄 Code reçu, échange contre un access token avec PKCE...');

  try {
    const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code_verifier: activeCodeVerifier
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error fetching token:', data);
      return res.status(500).send(`Erreur d'échange de jeton : ${JSON.stringify(data)}`);
    }

    // Save tokens
    const tokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      refresh_expires_in: data.refresh_expires_in,
      scope: data.scope,
      open_id: data.open_id,
      created_at: Math.floor(Date.now() / 1000)
    };

    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokenData, null, 2));
    console.log(`✅ Jetons sauvegardés avec succès dans : ${TOKENS_PATH}`);

    res.send(`
      <html>
        <head>
          <title>Connexion Réussie</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f7f7f7; color: #333; text-align: center; }
            .card { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
            h1 { color: #25d366; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Connexion Réussie ! 🎉</h1>
            <p>Les jetons TikTok ont été enregistrés localement dans <code>tiktok-tokens.json</code>.</p>
            <p>Vous pouvez fermer cet onglet et lancer le script de statistiques dans votre terminal.</p>
          </div>
        </body>
      </html>
    `);

    // Graceful shutdown after 3 seconds
    setTimeout(() => {
      console.log('Shutting down server...');
      process.exit(0);
    }, 3000);

  } catch (err) {
    console.error('Authentication Error:', err);
    res.status(500).send(`Erreur interne : ${err.message}`);
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SERVEUR D'AUTHENTIFICATION DE RETOUR (PKCE activé)`);
  console.log(`Lien d'accès : http://127.0.0.1:${PORT}`);
  console.log(`======================================================\n`);
});
