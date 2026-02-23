import fetch from 'node-fetch';
import 'dotenv/config';

async function inspectProfiles() {
    console.log("🔍 Inspection de la table PROFILES...");
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Accept': 'text/csv'
    };

    try {
        const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/profiles?limit=0';
        const response = await fetch(url, { headers });
        const csv = await response.text();
        console.log("Colonnes table profiles :", csv.split('\n')[0]);

        // Liste 5 records pour voir les data
        const resData = await fetch('https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/profiles?limit=5', {
            headers: { ...headers, 'Accept': 'application/json' }
        });
        console.log("Exemple de données :", await resData.json());

    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

inspectProfiles();
