const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ISSUER_ID = '85201996-ae2c-447a-9760-c5e5c890d3cd';
const KEY_ID = 'NRS8XWJ6KU';
const PRIVATE_KEY_PATH = path.join(__dirname, '..', 'AuthKey_NRS8XWJ6KU.p8');
const APP_ID = '6762569723';

function base64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateJWT() {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const payload = {
    iss: ISSUER_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 1200,
    aud: 'appstoreconnect-v1'
  };
  const signInput = `${base64url(Buffer.from(JSON.stringify(header)))}.${base64url(Buffer.from(JSON.stringify(payload)))}`;
  const signature = crypto.sign('sha256', Buffer.from(signInput), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${signInput}.${base64url(signature)}`;
}

async function main() {
  const token = generateJWT();
  const url = `https://api.appstoreconnect.apple.com/v1/apps/${APP_ID}/customerReviews?limit=200&sort=-createdDate`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) { console.error('API Error:', JSON.stringify(data)); return; }
  const reviews = data.data || [];
  console.log(`Total reviews (all territories): ${reviews.length}`);
  const dist = {};
  reviews.forEach(r => {
    const a = r.attributes;
    const key = `${a.rating}★ (${a.territory})`;
    dist[key] = (dist[key] || 0) + 1;
    console.log(`- ${a.rating}/5 | ${a.territory} | ${a.createdDate} | ${a.title || ''} | ${(a.body || '').slice(0, 120)}`);
  });
  console.log('\nDistribution:', JSON.stringify(dist, null, 2));

  // TestFlight: beta testers count
  const tf = await fetch(`https://api.appstoreconnect.apple.com/v1/betaTesters?limit=200`, { headers: { Authorization: `Bearer ${token}` } });
  const tfData = await tf.json();
  if (tf.ok) {
    console.log(`\nTestFlight beta testers: ${(tfData.data || []).length}`);
  } else {
    console.log('\nTestFlight testers fetch failed:', tf.status);
  }
}

main();
