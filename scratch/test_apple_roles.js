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

async function checkPermission(name, url, options = {}) {
  try {
    const token = generateJWT();
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });

    if (response.ok) {
      console.log(`✅ [${name}] Success (HTTP ${response.status})`);
      const data = await response.json();
      return { success: true, data };
    } else {
      const errData = await response.json().catch(() => ({}));
      console.log(`❌ [${name}] Failed (HTTP ${response.status}):`, JSON.stringify(errData));
      return { success: false, status: response.status, error: errData };
    }
  } catch (error) {
    console.log(`❌ [${name}] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function testAll() {
  console.log('Testing App Store Connect API Key capabilities...\n');
  const appId = '6762569723';

  // 1. Marketing / Localizations test (Read version details & localizations)
  await checkPermission(
    'Read App Store Versions (Marketing/Admin)',
    `https://api.appstoreconnect.apple.com/v1/apps/${appId}/appStoreVersions`
  );

  // 2. Customer Reviews (Customer Support/Marketing/Sales/Admin)
  await checkPermission(
    'Read Customer Reviews (Support/Marketing/Sales)',
    `https://api.appstoreconnect.apple.com/v1/apps/${appId}/customerReviews`
  );

  // 3. TestFlight Build access (Developer/Admin)
  await checkPermission(
    'Read TestFlight Builds (Developer/Admin)',
    `https://api.appstoreconnect.apple.com/v1/apps/${appId}/builds`
  );
}

testAll();
