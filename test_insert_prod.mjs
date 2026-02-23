import fetch from 'node-fetch';
import 'dotenv/config';

async function testInsertProd() {
    console.log("🧪 Test d'insertion manuelle en PRODUCTION...");

    // 1. Prendre un event au hasard
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    try {
        const resEvt = await fetch('https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/evenements?select=id&limit=1', { headers });
        const events = await resEvt.json();
        const eventId = events[0].id;

        console.log(`Utilisation de l'event : ${eventId}`);

        // 2. Tenter l'insertion (avec un ID utilisateur bidon, attention aux contraintes FK)
        // Comme c'est le service role, on peut essayer.
        // Mais user_id est probablement lié à auth.users.
        // Je vais essayer de trouver un user_id existant dans une autre table si possible.

        const dummyUsage = {
            user_id: '00000000-0000-0000-0000-000000000000', // Cet ID risque d'échouer si FK active
            event_id: eventId,
            times_seen: 1,
            last_seen_at: new Date().toISOString()
        };

        const resInsert = await fetch('https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage', {
            method: 'POST',
            headers,
            body: JSON.stringify(dummyUsage)
        });

        if (resInsert.ok) {
            console.log("✅ Insertion réussie ! La table fonctionne.");
            const data = await resInsert.json();
            console.log(data);
        } else {
            const err = await resInsert.text();
            console.log(`❌ Échec de l'insertion : ${err}`);
        }

    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

testInsertProd();
