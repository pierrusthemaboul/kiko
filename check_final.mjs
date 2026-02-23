import fetch from 'node-fetch';
import 'dotenv/config';

async function checkHistoryFinal() {
    const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage?select=*,evenements(titre)&order=last_seen_at.desc&limit=10';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`
    };
    try {
        const res = await fetch(url, { headers });
        const data = await res.json();
        console.log("--- DERNIERS ÉVÉNEMENTS ENREGISTRÉS ---");
        data.forEach((u, i) => {
            console.log(`${i + 1}. [${u.last_seen_at}] ${u.evenements?.titre} (User: ${u.user_id.slice(0, 8)})`);
        });
    } catch (e) { console.error(e); }
}
checkHistoryFinal();
