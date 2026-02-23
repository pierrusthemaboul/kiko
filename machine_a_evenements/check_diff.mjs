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

async function checkDiff() {
    console.log("🔍 Récupération des événements local (goju2)...");
    const { data: localEvents, error: localError } = await local
        .from('goju2')
        .select('titre');

    if (localError) {
        console.error("❌ Erreur local:", localError.message);
        return;
    }

    console.log(`✅ ${localEvents.length} événements trouvés en local.`);

    console.log("🔍 Récupération des événements production (goju2)...");
    const { data: prodGojuEvents, error: prodGojuError } = await prod
        .from('goju2')
        .select('titre');

    let prodGojuTitles = new Set();
    if (prodGojuError) {
        console.warn("⚠️  Table 'goju2' non trouvée en production ou erreur:", prodGojuError.message);
    } else {
        console.log(`✅ ${prodGojuEvents.length} événements trouvés dans goju2 production.`);
        prodGojuTitles = new Set(prodGojuEvents.map(e => e.titre));
    }

    console.log("🔍 Récupération des événements production (evenements) pour comparaison large...");
    const { data: prodEvenements, error: prodEvenementsError } = await prod
        .from('evenements')
        .select('titre');

    let prodEvenementsTitles = new Set();
    if (prodEvenementsError) {
        console.error("❌ Erreur production (evenements):", prodEvenementsError.message);
    } else {
        console.log(`✅ ${prodEvenements.length} événements trouvés dans evenements production.`);
        prodEvenementsTitles = new Set(prodEvenements.map(e => e.titre));
    }

    const diffGoju = localEvents.filter(e => !prodGojuTitles.has(e.titre));
    const diffTotal = localEvents.filter(e => !prodGojuTitles.has(e.titre) && !prodEvenementsTitles.has(e.titre));

    console.log("\n--- ANALYSE ---");
    console.log(`Événements en local (goju2) MAIS PAS en production (goju2) : ${diffGoju.length}`);

    if (diffGoju.length > 0) {
        console.log("\nListe (absents de goju2 prod) :");
        diffGoju.forEach(e => console.log(`- ${e.titre}`));
    }

    console.log(`\nÉvénements en local (goju2) MAIS PAS DU TOUT en production (ni goju2, ni evenements) : ${diffTotal.length}`);
    if (diffTotal.length > 0 && diffTotal.length !== diffGoju.length) {
        console.log("\nListe (strictement absents de prod) :");
        diffTotal.forEach(e => console.log(`- ${e.titre}`));
    }
}

checkDiff();
