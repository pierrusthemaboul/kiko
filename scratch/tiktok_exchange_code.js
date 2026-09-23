const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'tiktok-credentials.json');
const TOKENS_PATH = path.join(__dirname, '..', 'tiktok-tokens.json');
const TEMP_PATH = path.join(__dirname, 'tiktok_temp_auth.json');

async function main() {
  const urlArg = process.argv[2];
  if (!urlArg) {
    console.error('❌ Veuillez fournir l\'URL de redirection reçue de TikTok.');
    console.error('Usage: node scratch/tiktok_exchange_code.js "https://..."');
    process.exit(1);
  }

  // Parse code and state from URL
  let parsedUrl;
  try {
    parsedUrl = new URL(urlArg);
  } catch {
    console.error('❌ URL invalide.');
    process.exit(1);
  }

  const code = parsedUrl.searchParams.get('code');
  const state = parsedUrl.searchParams.get('state');

  if (!code) {
    console.error('❌ Le paramètre "code" est manquant dans l\'URL.');
    process.exit(1);
  }

  // Load temp auth data (verifier, state)
  if (!fs.existsSync(TEMP_PATH)) {
    console.error('❌ Fichier temporaire tiktok_temp_auth.json introuvable. Avez-vous lancé Etape 1 ?');
    process.exit(1);
  }
  const tempAuth = JSON.parse(fs.readFileSync(TEMP_PATH, 'utf8'));

  if (state !== tempAuth.state) {
    console.warn('⚠️ Attention: le paramètre "state" ne correspond pas. Cela peut être normal si vous avez lancé plusieurs fois le script.');
  }

  // Load credentials
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error(`❌ Fichier credentials introuvable : ${CREDENTIALS_PATH}`);
    process.exit(1);
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

  console.log('🔄 Échange du code d\'autorisation contre des jetons d\'accès...');

  try {
    const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_key: credentials.clientKey,
        client_secret: credentials.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: tempAuth.redirect_uri,
        code_verifier: tempAuth.code_verifier
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Échec de l\'échange de jetons :', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    // Save final tokens
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
    console.log('\n======================================================');
    console.log('✅ JETONS TIKTOK ENREGISTRÉS AVEC SUCCÈS !');
    console.log('======================================================');
    console.log(`Fichier : ${TOKENS_PATH}`);
    console.log(`Scopes  : ${data.scope}`);
    console.log('Vous pouvez maintenant lancer le script de statistiques.');
    console.log('======================================================\n');

    // Clean up temp file
    try {
      fs.unlinkSync(TEMP_PATH);
    } catch {}

  } catch (err) {
    console.error('❌ Erreur technique :', err.message);
  }
}

main();
