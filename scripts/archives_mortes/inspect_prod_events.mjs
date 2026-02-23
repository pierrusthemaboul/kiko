import fetch from 'node-fetch';
import 'dotenv/config';

async function inspectProdEvents() {
    console.log("🔍 Exploration de la table evenements en PRODUCTION...");

    // On regarde combien d'événements sont considérés comme des "Stars" (Niveau 1)
    const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/evenements?select=id,titre,notoriete,date&notoriete=gte.75&order=notoriete.desc';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, { headers });
        const data = await response.json();

        console.log(`📊 Nombre d'événements "Stars" (Notoriété >= 75) en PROD : ${data.length}`);

        if (data.length > 0) {
            console.log("\nTop 10 des événements les plus connus :");
            data.slice(0, 10).forEach(e => console.log(`- ${e.titre} (${e.notoriete})`));
        }

        // On vérifie aussi s'il y a des événements avec une notoriété très faible ou absente
        const url2 = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/evenements?select=id&notoriete=lt.50';
        const res2 = await fetch(url2, { headers });
        const data2 = await res2.json();
        console.log(`📊 Nombre d'événements "Scolaires/Experts" (Notoriété < 50) : ${data2.length}`);

    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

inspectProdEvents();
