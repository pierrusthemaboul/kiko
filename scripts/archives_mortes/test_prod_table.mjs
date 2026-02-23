import fetch from 'node-fetch';
import 'dotenv/config';

async function testProdTable() {
    console.log("🧪 Test de l'existence de la table en PRODUCTION...");

    const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    };

    try {
        // On essaie juste un SELECT vide
        const response = await fetch(url + '?limit=1', { headers });
        if (response.status === 404) {
            console.log("❌ Table ABSENTE en production (404).");
        } else if (response.ok) {
            console.log("✅ Table PRÉSENTE en production !");
        } else {
            const txt = await response.text();
            console.log(`⚠️ Statut inconnu (${response.status}): ${txt}`);
        }
    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

testProdTable();
