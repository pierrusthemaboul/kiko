import fetch from 'node-fetch';
import 'dotenv/config';

async function getRecentHistory() {
    console.log("📊 Récupération des 50 dernières vues en PRODUCTION...");

    // On récupère tout pour voir si des gens jouent
    const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage?select=*,evenements(titre)&order=last_seen_at.desc&limit=50';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, { headers });
        const data = await response.json();

        if (data.length === 0) {
            console.log("📭 Aucun enregistrement en production.");
            console.log("Note: Si tu joues sans être connecté (mode Invité), rien n'apparaîtra ici car c'est stocké uniquement dans ton téléphone.");
        } else {
            console.log(`\n📋 Historique récent :\n`);
            data.forEach((u, i) => {
                const titre = u.evenements ? u.evenements.titre : 'Inconnu';
                const date = new Date(u.last_seen_at).toLocaleTimeString();
                console.log(`${i + 1}. [${date}] ${titre.padEnd(40)} | Vues: ${u.times_seen} | User: ${u.user_id.slice(0, 8)}...`);
            });
        }
    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

getRecentHistory();
