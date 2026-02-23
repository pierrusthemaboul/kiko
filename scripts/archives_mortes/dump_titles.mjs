import fetch from 'node-fetch';
import 'dotenv/config';
import fs from 'fs';

async function dumpAllTitles() {
    const baseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/evenements?select=id,titre';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
    };

    let allEvents = [];
    let from = 0;
    const limit = 1000;

    try {
        while (true) {
            const range = `${from}-${from + limit - 1}`;
            const response = await fetch(baseUrl, {
                headers: { ...headers, 'Range': range }
            });
            const data = await response.json();
            if (data.length === 0) break;
            allEvents = allEvents.concat(data);
            if (data.length < limit) break;
            from += limit;
        }

        fs.writeFileSync('all_titles.json', JSON.stringify(allEvents, null, 2));
        console.log(`✅ ${allEvents.length} titres enregistrés dans all_titles.json`);

    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

dumpAllTitles();
