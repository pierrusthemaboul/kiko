const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ISSUER_ID='85201996-ae2c-447a-9760-c5e5c890d3cd',KEY_ID='NRS8XWJ6KU';
const KEY=path.join(__dirname,'..','AuthKey_NRS8XWJ6KU.p8');
const VID='cb65cdd0-a85c-4e24-8f29-45438a52741d';
function b64(b){return b.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function jwt(){const k=fs.readFileSync(KEY,'utf8');const h={alg:'ES256',kid:KEY_ID,typ:'JWT'};const p={iss:ISSUER_ID,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+1200,aud:'appstoreconnect-v1'};const s=`${b64(Buffer.from(JSON.stringify(h)))}.${b64(Buffer.from(JSON.stringify(p)))}`;return `${s}.${b64(crypto.sign('sha256',Buffer.from(s),{key:k,dsaEncoding:'ieee-p1363'}))}`;}
async function call(m,u,body){const r=await fetch(`https://api.appstoreconnect.apple.com/v1${u}`,{method:m,headers:{Authorization:`Bearer ${jwt()}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({}));if(!r.ok)console.log(m,u,'=>',r.status,JSON.stringify(j).slice(0,400));return j;}
(async()=>{
  const locs=await call('GET',`/appStoreVersions/${VID}/appStoreVersionLocalizations`);
  for(const l of locs.data||[]){
    const loc=l.attributes.locale;
    const txt=loc==='fr-FR'?'Corrections de bugs et amélioration de la stabilité.':'Bug fixes and improved stability.';
    await call('PATCH',`/appStoreVersionLocalizations/${l.id}`,{data:{type:'appStoreVersionLocalizations',id:l.id,attributes:{whatsNew:txt}}});
    console.log('PATCHED',loc,'| current whatsNew:',l.attributes.whatsNew);
  }
  // verify
  const again=await call('GET',`/appStoreVersions/${VID}/appStoreVersionLocalizations`);
  (again.data||[]).forEach(l=>console.log('NOW:',l.attributes.locale,'->',l.attributes.whatsNew));
})().catch(e=>console.error(e));
