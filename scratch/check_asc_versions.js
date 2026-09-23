const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ISSUER_ID = '85201996-ae2c-447a-9760-c5e5c890d3cd';
const KEY_ID = 'NRS8XWJ6KU';
const PRIVATE_KEY_PATH = path.join(__dirname, '..', 'AuthKey_NRS8XWJ6KU.p8');
const APP_ID = '6762569723';
function b64(buf){return buf.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function jwt(){const key=fs.readFileSync(PRIVATE_KEY_PATH,'utf8');const h={alg:'ES256',kid:KEY_ID,typ:'JWT'};const p={iss:ISSUER_ID,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+1200,aud:'appstoreconnect-v1'};const s=`${b64(Buffer.from(JSON.stringify(h)))}.${b64(Buffer.from(JSON.stringify(p)))}`;return `${s}.${b64(crypto.sign('sha256',Buffer.from(s),{key,dsaEncoding:'ieee-p1363'}))}`;}
async function get(u){const r=await fetch(`https://api.appstoreconnect.apple.com/v1${u}`,{headers:{Authorization:`Bearer ${jwt()}`}});const j=await r.json();if(j.errors)console.error(JSON.stringify(j.errors).slice(0,500));return j;}
(async()=>{
  const v = await get(`/apps/${APP_ID}/appStoreVersions?limit=10`);
  console.log('count:', (v.data||[]).length);
  (v.data||[]).forEach(x=>console.log(x.id, JSON.stringify(x.attributes)));
})().catch(e=>console.error(e));
