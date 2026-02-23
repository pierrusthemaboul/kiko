import fetch from 'node-fetch';
import 'dotenv/config';

async function listProfiles() {
    const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/profiles?select=*&limit=100';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`
    };
    try {
        const res = await fetch(url, { headers });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) { console.error(e); }
}
listProfiles();
