const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ISSUER_ID = '85201996-ae2c-447a-9760-c5e5c890d3cd';
const KEY_ID = 'NRS8XWJ6KU';
const PRIVATE_KEY_PATH = path.join(__dirname, '..', 'AuthKey_NRS8XWJ6KU.p8');

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateJWT() {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

  const header = {
    alg: 'ES256',
    kid: KEY_ID,
    typ: 'JWT'
  };

  const payload = {
    iss: ISSUER_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 1200,
    aud: 'appstoreconnect-v1'
  };

  const headerStr = base64url(Buffer.from(JSON.stringify(header)));
  const payloadStr = base64url(Buffer.from(JSON.stringify(payload)));
  const signInput = `${headerStr}.${payloadStr}`;

  const signature = crypto.sign(
    'sha256',
    Buffer.from(signInput),
    {
      key: privateKey,
      dsaEncoding: 'ieee-p1363'
    }
  );

  const signatureStr = base64url(signature);
  return `${signInput}.${signatureStr}`;
}

async function getAppVersions() {
  try {
    const token = generateJWT();
    console.log('Fetching App Store versions...');
    const response = await fetch('https://api.appstoreconnect.apple.com/v1/apps/6762569723/appStoreVersions', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('API Error:', data);
      return;
    }

    console.log('\n--- APP STORE VERSIONS ---');
    data.data.forEach(version => {
      console.log(`Version: ${version.attributes.versionString}`);
      console.log(`  State: ${version.attributes.appStoreState}`);
      console.log(`  Created: ${version.attributes.createdDate || 'N/A'}`);
      console.log(`  ID: ${version.id}\n`);
    });
  } catch (error) {
    console.error('Execution failed:', error);
  }
}

getAppVersions();
