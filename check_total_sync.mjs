import fetch from 'node-fetch';
import 'dotenv/config';

async function checkTotalSync() {
    const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage?select=user_id,times_seen,last_seen_at,evenements(titre)';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`
    };
    try {
        const res = await fetch(url, { headers });
        const data = await res.json();
        console.log(`Total records: ${data.length}`);
        if (data.length > 0) {
            const users = [...new Set(data.map(d => d.user_id))];
            console.log(`Nombre d'utilisateurs synchronisés: ${users.length}`);
            users.forEach(u => {
                const count = data.filter(d => d.user_id === u).length;
                console.log(`- User ${u.slice(0, 8)}... : ${count} événements vus`);
            });
        }
    } catch (e) { console.error(e); }
}
checkTotalSync();
