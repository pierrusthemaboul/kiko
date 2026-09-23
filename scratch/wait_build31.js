const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ISSUER_ID='85201996-ae2c-447a-9760-c5e5c890d3cd',KEY_ID='NRS8XWJ6KU',APP_ID='6762569723';
const KEY=path.join(__dirname,'..','AuthKey_NRS8XWJ6KU.p8');
function b64(b){return b.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function jwt(){const k=fs.readFileSync(KEY,'utf8');const h={alg:'ES256',kid:KEY_ID,typ:'JWT'};const p={iss:ISSUER_ID,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+1200,aud:'appstoreconnect-v1'};const s=`${b64(Buffer.from(JSON.stringify(h)))}.${b64(Buffer.from(JSON.stringify(p)))}`;return `${s}.${b64(crypto.sign('sha256',Buffer.from(s),{key:k,dsaEncoding:'ieee-p1363'}))}`;}
async function get(u){const r=await fetch(`https://api.appstoreconnect.apple.com/v1${u}`,{headers:{Authorization:`Bearer ${jwt()}`}});return r.json();}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  for(let i=0;i<20;i++){
    const b=await get(`/builds?filter[app]=${APP_ID}&limit=3&sort=-uploadedDate`);
    const top=(b.data||[])[0];
    if(top){
      console.log(`[${i}] v${top.attributes.version} ${top.attributes.processingState} id=${top.id}`);
      if(top.attributes.version==='31'&&top.attributes.processingState==='VALID'){console.log('READY',top.id);return;}
    }
    await sleep(60000);
  }
  console.log('timeout');
})().catch(e=>console.error(e));
