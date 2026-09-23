const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ISSUER_ID = '85201996-ae2c-447a-9760-c5e5c890d3cd';
const KEY_ID = 'NRS8XWJ6KU';
const PRIVATE_KEY_PATH = path.join(__dirname, '..', 'AuthKey_NRS8XWJ6KU.p8');
const APP_ID = '6762569723';

function b64(buf) { return buf.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
function jwt() {
  const key = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  const h = { alg:'ES256', kid:KEY_ID, typ:'JWT' };
  const p = { iss:ISSUER_ID, iat:Math.floor(Date.now()/1000), exp:Math.floor(Date.now()/1000)+1200, aud:'appstoreconnect-v1' };
  const s = `${b64(Buffer.from(JSON.stringify(h)))}.${b64(Buffer.from(JSON.stringify(p)))}`;
  return `${s}.${b64(crypto.sign('sha256', Buffer.from(s), {key, dsaEncoding:'ieee-p1363'}))}`;
}
async function get(u) {
  const r = await fetch(`https://api.appstoreconnect.apple.com/v1${u}`, {headers:{Authorization:`Bearer ${jwt()}`}});
  return r.json();
}
(async () => {
  const vers = await get(`/apps/${APP_ID}/appStoreVersions?limit=5&sort=-createdDate&fields[appStoreVersions]=versionString,appStoreState,platform,createdDate`);
  console.log('VERSIONS:');
  (vers.data||[]).forEach(v=>console.log(' ', v.id, v.attributes.versionString, v.attributes.appStoreState, v.attributes.createdDate));
  const builds = await get(`/builds?filter[app]=${APP_ID}&limit=5&sort=-uploadedDate&fields[builds]=version,processingState,expired,uploadedDate&include=preReleaseVersion`);
  console.log('BUILDS:');
  (builds.data||[]).forEach(b=>console.log(' ', b.id, 'v'+b.attributes.version, b.attributes.processingState, 'expired:'+b.attributes.expired));
})().catch(e=>console.error(e));
