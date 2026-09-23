const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ISSUER_ID='85201996-ae2c-447a-9760-c5e5c890d3cd',KEY_ID='NRS8XWJ6KU',APP_ID='6762569723';
const KEY=path.join(__dirname,'..','AuthKey_NRS8XWJ6KU.p8');
const BUILD_ID='81988505-d11f-4f08-a01d-b06a3d00268a';
function b64(b){return b.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function jwt(){const k=fs.readFileSync(KEY,'utf8');const h={alg:'ES256',kid:KEY_ID,typ:'JWT'};const p={iss:ISSUER_ID,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+1200,aud:'appstoreconnect-v1'};const s=`${b64(Buffer.from(JSON.stringify(h)))}.${b64(Buffer.from(JSON.stringify(p)))}`;return `${s}.${b64(crypto.sign('sha256',Buffer.from(s),{key:k,dsaEncoding:'ieee-p1363'}))}`;}
async function call(method,u,body){const r=await fetch(`https://api.appstoreconnect.apple.com/v1${u}`,{method,headers:{Authorization:`Bearer ${jwt()}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const j=await r.json().catch(()=>({}));if(!r.ok){console.log(method,u,'=>',r.status,JSON.stringify(j).slice(0,600));return null;}return j;}
(async()=>{
  // 1. create version 1.7.7
  const v=await call('POST','/appStoreVersions',{data:{type:'appStoreVersions',attributes:{platform:'IOS',versionString:'1.7.7'},relationships:{app:{data:{type:'apps',id:APP_ID}}}}});
  if(!v)return;
  const vid=v.data.id;
  console.log('VERSION_CREATED',vid);
  // 2. attach build
  await call('PATCH',`/appStoreVersions/${vid}/relationships/build`,{data:{type:'builds',id:BUILD_ID}});
  console.log('BUILD_ATTACHED');
  // 3. localizations
  for(const [locale,txt] of [['fr-FR','Corrections de bugs et amélioration de la stabilité.'],['en-US','Bug fixes and improved stability.']]){
    await call('POST','/appStoreVersionLocalizations',{data:{type:'appStoreVersionLocalizations',attributes:{locale,whatsNew:txt},relationships:{appStoreVersion:{data:{type:'appStoreVersions',id:vid}}}}});
    console.log('LOC',locale,'ok');
  }
  console.log('DONE_PREP');
})().catch(e=>console.error(e));
