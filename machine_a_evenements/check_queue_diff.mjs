import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Credentials Production
const PROD_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const PROD_KEY = 'process.env.SUPABASE_PROD_SERVICE_ROLE_KEY';
const prod = createClient(PROD_URL, PROD_KEY);

// Credentials Local
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const local = createClient(LOCAL_URL, LOCAL_KEY);

async function checkQueueDiff() {
    console.log("🔍 Récupération des événements local (queue_sevent)...");
    const { data: localQueue, error: localError } = await local
        .from('queue_sevent')
        .select('titre');

    if (localError) {
        console.error("❌ Erreur local (queue_sevent):", localError.message);
        return;
    }

    console.log(`✅ ${localQueue.length} événements trouvés dans la file d'attente locale.`);

    console.log("🔍 Récupération des événements production (evenements) pour comparaison...");

    // On récupère tout pour être sûr, ou on fait un check par titre si c'est trop gros.
    // Ici on va faire par titres.
    const { data: prodEvenements, error: prodEvenementsError } = await prod
        .from('evenements')
        .select('titre');

    if (prodEvenementsError) {
        console.error("❌ Erreur production (evenements):", prodEvenementsError.message);
        return;
    }

    const prodTitles = new Set(prodEvenements.map(e => e.titre.toLowerCase().trim()));

    const diff = localQueue.filter(e => {
        const t = e.titre.toLowerCase().trim();
        return !prodTitles.has(t);
    });

    console.log("\n--- ANALYSE ---");
    console.log(`Événements en local (queue_sevent) MAIS PAS en production (evenements) : ${diff.length}`);

    if (diff.length > 0) {
        console.log("\nListe des nouveaux événements en attente :");
        diff.forEach(e => console.log(`- ${e.titre}`));
    } else {
        console.log("\nTous les événements de la queue locale existent déjà en production (evenements).");
    }
}

checkQueueDiff();
