import fetch from 'node-fetch';
import 'dotenv/config';

async function checkProdSchema() {
    console.log("🔍 Vérification des colonnes de 'user_event_usage' en PRODUCTION...");

    // On utilise une astuce pour voir les colonnes via un message d'erreur ou en demandant le format CSV
    const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage?select=*&limit=0';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Accept': 'text/csv'
    };

    try {
        const response = await fetch(url, { headers });
        const csv = await response.text();
        console.log("En-tête CSV (colonnes) :", csv.split('\n')[0]);
    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

checkProdSchema();
