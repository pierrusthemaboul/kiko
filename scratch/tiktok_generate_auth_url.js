const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'tiktok-credentials.json');
const TEMP_PATH = path.join(__dirname, 'tiktok_temp_auth.json');

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error(`❌ Credentials file not found at ${CREDENTIALS_PATH}`);
  process.exit(1);
}
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generatePKCE() {
  const codeVerifier = base64url(crypto.randomBytes(32));
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64url(hash);
  return { codeVerifier, codeChallenge };
}

function main() {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = Math.random().toString(36).substring(2);
  const redirectUri = 'https://pierrusthemaboul.github.io/kiko/auth/callback';

  // TikTok authorization URL
  const scopes = 'user.info.basic';
  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  authUrl.searchParams.append('client_key', credentials.clientKey);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  // Save verifier and state for the second step
  const tempAuth = {
    code_verifier: codeVerifier,
    state: state,
    redirect_uri: redirectUri,
    created_at: Math.floor(Date.now() / 1000)
  };
  fs.writeFileSync(TEMP_PATH, JSON.stringify(tempAuth, null, 2));

  console.log('\n======================================================');
  console.log('🔗 ETAPE 1 : LIEN D\'AUTORISATION TIKTOK');
  console.log('======================================================');
  console.log('1. Ouvrez ce lien dans votre navigateur :');
  console.log(`\n${authUrl.toString()}\n`);
  console.log('2. Connectez-vous avec votre compte créateur @timalaus0.');
  console.log('3. Une fois connecté, TikTok va vous rediriger vers une page');
  console.log('   (qui affichera probablement une erreur ou 404, c\'est normal).');
  console.log('4. Copiez toute l\'URL de la barre d\'adresse (commençant par https://pierrusthemaboul.github.io...)');
  console.log('   et collez-la ici dans le chat.');
  console.log('======================================================\n');
}

main();
