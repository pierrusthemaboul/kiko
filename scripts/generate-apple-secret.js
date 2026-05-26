const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const TEAM_ID = 'RBH23M8YUV';
const KEY_ID = 'GHCU76UGFY';
const CLIENT_IDS = ['com.pierretulle.juno2', 'com.pierretulle.juno2.dev'];

// Find .p8 file in the current directory or scripts directory
let p8Path = null;
const rootDir = path.join(__dirname, '..');
const filesInRoot = fs.readdirSync(rootDir);

console.log(`Fichiers trouvés à la racine du projet (${rootDir}) :`);
filesInRoot.forEach(f => {
  if (f.toLowerCase().includes('authkey') || f.toLowerCase().includes('p8')) {
    console.log(`- ${f}`);
  }
});

const p8InRoot = filesInRoot.find(f => f.toLowerCase().endsWith('.p8') || f.toLowerCase().endsWith('.p8.txt') || f.toLowerCase().includes('ghcu76ugfy'));

if (p8InRoot) {
  p8Path = path.join(rootDir, p8InRoot);
} else {
  const filesInScripts = fs.readdirSync(__dirname);
  const p8InScripts = filesInScripts.find(f => f.toLowerCase().endsWith('.p8') || f.toLowerCase().endsWith('.p8.txt') || f.toLowerCase().includes('ghcu76ugfy'));
  if (p8InScripts) {
    p8Path = path.join(__dirname, p8InScripts);
  }
}

if (!p8Path) {
  console.error('\x1b[31mError: Aucun fichier .p8 (clé privée Apple) trouvé dans le dossier du projet.\x1b[0m');
  console.log('Veuillez copier le fichier .p8 téléchargé (par exemple: AuthKey_GHCU76UGFY.p8) à la racine du projet, puis réessayez.');
  process.exit(1);
}

console.log(`\x1b[34mLecture de la clé privée : ${path.basename(p8Path)}\x1b[0m`);
const privateKey = fs.readFileSync(p8Path, 'utf8');

function generateClientSecret(clientId) {
  const header = {
    alg: 'ES256',
    kid: KEY_ID,
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + 86400 * 180, // 180 jours (~6 mois maximum autorisé par Apple)
    aud: 'https://appleid.apple.com',
    sub: clientId
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = crypto.sign(
    'sha256',
    Buffer.from(signingInput),
    {
      key: privateKey,
      dsaEncoding: 'ieee-p1363'
    }
  );
  
  const signatureB64 = signature.toString('base64url');
  return `${signingInput}.${signatureB64}`;
}

console.log('\n\x1b[32m=== Génération des Secret Keys pour Supabase ===\x1b[0m\n');

CLIENT_IDS.forEach(clientId => {
  try {
    const jwt = generateClientSecret(clientId);
    console.log(`\x1b[36mClient ID (Bundle ID) :\x1b[0m ${clientId}`);
    console.log(`\x1b[33mSecret Key (JWT) :\x1b[0m`);
    console.log(jwt);
    console.log('-'.repeat(80));
  } catch (error) {
    console.error(`Erreur pour ${clientId}:`, error.message);
  }
});

console.log('\n\x1b[32mCopiez le Secret Key correspondant au Client ID que vous configurez dans Supabase.\x1b[0m');
console.log('Note : Ce secret expirera dans 6 mois. Il faudra alors relancer ce script avec la même clé .p8 pour en générer un nouveau.');
