const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KEY_PATH = path.join(__dirname, '..', 'kiko-chrono-c28384984e64.json');
const PACKAGE_NAME = 'com.pierretulle.juno2';

function base64url(buf) {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function generateGoogleJWT(keyData) {
  const privateKey = keyData.private_key;
  const clientEmail = keyData.client_email;

  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: keyData.token_uri || 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const headerStr = base64url(Buffer.from(JSON.stringify(header)));
  const payloadStr = base64url(Buffer.from(JSON.stringify(payload)));
  const signInput = `${headerStr}.${payloadStr}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(privateKey);
  const signatureStr = base64url(signature);

  return `${signInput}.${signatureStr}`;
}

async function getAccessToken(keyData) {
  const jwt = generateGoogleJWT(keyData);
  
  const response = await fetch(keyData.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Token request failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function testPlayConsoleAccess() {
  try {
    console.log('Reading Google service account credentials...');
    const keyData = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));
    console.log(`Service Account Email: ${keyData.client_email}`);

    console.log('Generating JWT and fetching OAuth2 Access Token...');
    const accessToken = await getAccessToken(keyData);
    console.log('Successfully acquired OAuth2 Access Token.');

    console.log(`Testing Google Play API access for package: ${PACKAGE_NAME}...`);
    // Let's call the reviews endpoint as a test
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/reviews`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const result = await response.json();

    if (response.ok) {
      console.log('==================================================');
      console.log('✅ GOOGLE PLAY CONSOLE ACCESS SUCCESSFUL!');
      console.log('==================================================');
      console.log(`Successfully fetched reviews metadata.`);
      console.log(`Number of reviews found: ${result.reviews ? result.reviews.length : 0}`);
      if (result.reviews && result.reviews.length > 0) {
        console.log('Sample review:');
        console.log(`- Author: ${result.reviews[0].authorName}`);
        console.log(`- Rating: ${result.reviews[0].comments[0].userComment.starRating}/5`);
        console.log(`- Text: ${result.reviews[0].comments[0].userComment.text}`);
      }
    } else {
      console.log('==================================================');
      console.log('❌ GOOGLE PLAY CONSOLE ACCESS FAILED');
      console.log('==================================================');
      console.log(`HTTP Status: ${response.status}`);
      console.log('Error Details:', JSON.stringify(result, null, 2));
      if (response.status === 401 || response.status === 403) {
        console.log('\n💡 Tip: Please make sure that:');
        console.log(`1. The service account "${keyData.client_email}" is linked to your Google Play Console.`);
        console.log('2. It has the required permissions (e.g., View app information and download bulk reports).');
      }
    }

  } catch (error) {
    console.error('Test Execution Failed:', error);
  }
}

testPlayConsoleAccess();
