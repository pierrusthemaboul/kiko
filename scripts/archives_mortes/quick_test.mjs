import fetch from 'node-fetch';
import 'dotenv/config';

async function quickTest() {
    const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/profiles?select=count';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`
    };
    try {
        const res = await fetch(url, { headers });
        console.log("Status:", res.status);
        console.log("Body:", await res.text());
    } catch (e) { console.error(e); }
}
quickTest();
