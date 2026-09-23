const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ISSUER_ID='85201996-ae2c-447a-9760-c5e5c890d3cd',KEY_ID='NRS8XWJ6KU',APP_ID='6762569723';
const KEY=path.join(__dirname,'..','AuthKey_NRS8XWJ6KU.p8');
const VID='cb65cdd0-a85c-4e24-8f29-45438a52741d';
function b64(b){return b.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function jwt(){const k=fs.readFileSync(KEY,'utf8');const h={alg:'ES256',kid:KEY_ID,typ:'JWT'};const p={iss:ISSUER_ID,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+1200,aud:'appstoreconnect-v1'};const s=`${b64(Buffer.from(JSON.stringify(h)))}.${b64(Buffer.from(JSON.stringify(p)))}`;return `${s}.${b64(crypto.sign('sha256',Buffer.from(s),{key:k,dsaEncoding:'ieee-p1363'}))}`;}
async function call(m,u,body){const r=await fetch(`https://api.appstoreconnect.apple.com/v1${u}`,{method:m,headers:{Authorization:`Bearer ${jwt()}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j={raw:t}}if(!r.ok){console.log(m,u,'=>',r.status,JSON.stringify(j).slice(0,700));return null;}return j;}
(async()=>{
  const sub=await call('POST','/reviewSubmissions',{data:{type:'reviewSubmissions',attributes:{platform:'IOS'},relationships:{app:{data:{type:'apps',id:APP_ID}}}}});
  if(!sub)return; const sid=sub.data.id; console.log('SUBMISSION',sid);
  const item=await call('POST','/reviewSubmissionItems',{data:{type:'reviewSubmissionItems',attributes:{},relationships:{appStoreVersion:{data:{type:'appStoreVersions',id:VID}},reviewSubmission:{data:{type:'reviewSubmissions',id:sid}}}}});
  if(!item)return; console.log('ITEM',item.data.id);
  const done=await call('PATCH',`/reviewSubmissions/${sid}`,{data:{type:'reviewSubmissions',id:sid,attributes:{submitted:true}}});
  if(done)console.log('SUBMITTED_OK');
})().catch(e=>console.error(e));
