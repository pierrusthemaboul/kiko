import fetch from 'node-fetch';
import 'dotenv/config';

async function countUserEvents() {
    const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage?select=count&user_id=eq.9d97c5fe-a193-4702-863a-bb33d6b04395';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`
    };
    try {
        const res = await fetch(url, { headers });
        const data = await res.json();
        console.log(`User 9d97c5fe a enregistré ${data[0].count} événements.`);
    } catch (e) { console.error(e); }
}
countUserEvents();
