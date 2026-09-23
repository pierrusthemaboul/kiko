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
    exp: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
    aud: 'appstoreconnect-v1'
  };

  const headerStr = base64url(Buffer.from(JSON.stringify(header)));
  const payloadStr = base64url(Buffer.from(JSON.stringify(payload)));
  const signInput = `${headerStr}.${payloadStr}`;

  // Sign using ES256 (ECDSA with SHA-256) and IEEE P1363 raw signature encoding format
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

async function testConnection() {
  try {
    const token = generateJWT();
    console.log('JWT generated successfully.');

    const response = await fetch('https://api.appstoreconnect.apple.com/v1/apps', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('API Error:', data);
      return;
    }

    console.log('Successfully connected to App Store Connect API!');
    console.log('Your Apps:');
    if (data.data && data.data.length > 0) {
      data.data.forEach(app => {
        console.log(`- ${app.attributes.name} (Bundle ID: ${app.attributes.bundleId}, App ID: ${app.id})`);
      });
    } else {
      console.log('No apps found.');
    }
  } catch (error) {
    console.error('Execution failed:', error);
  }
}

testConnection();
