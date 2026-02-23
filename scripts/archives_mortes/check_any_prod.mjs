import fetch from 'node-fetch';
import 'dotenv/config';

async function checkAnyUsage() {
    console.log("🕵️ Recherche de N'IMPORTE QUEL enregistrement en PRODUCTION...");

    const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage?select=*';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, { headers });
        const data = await response.json();

        if (Array.isArray(data)) {
            console.log(`✅ Nombre total d'enregistrements trouvés : ${data.length}`);
            if (data.length > 0) {
                console.log("Échantillon :", data.slice(0, 5));
            }
        } else {
            console.log("❌ Résultat inattendu :", data);
        }
    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

checkAnyUsage();
