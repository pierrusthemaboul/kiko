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

async function checkQueueAnalysis() {
    console.log("🔍 Récupération des données...");

    const { data: localQueue } = await local.from('queue_sevent').select('titre');
    const { data: prodEvenements } = await prod.from('evenements').select('titre');
    const { data: prodGoju } = await prod.from('goju2').select('titre');

    const localTitles = localQueue.map(e => e.titre.toLowerCase().trim());
    const prodEvTitles = new Set(prodEvenements.map(e => e.titre.toLowerCase().trim()));
    const prodGojuTitles = new Set(prodGoju ? prodGoju.map(e => e.titre.toLowerCase().trim()) : []);

    const onlyLocal = localQueue.filter(e => !prodEvTitles.has(e.titre.toLowerCase().trim()));
    const alreadyInProd = localQueue.filter(e => prodEvTitles.has(e.titre.toLowerCase().trim()));

    console.log(`\n📊 Résultats pour queue_sevent (local) - Total: ${localQueue.length} événements`);
    console.log(`────────────────────────────────────────────────────────────`);

    if (onlyLocal.length > 0) {
        console.log(`🆕 ${onlyLocal.length} événements ABSENTS de la table 'evenements' (Production) :`);
        onlyLocal.forEach(e => console.log(`   - ${e.titre}`));
    } else {
        console.log(`✅ Aucun événement de la queue locale n'est absent de la production.`);
    }

    if (alreadyInProd.length > 0) {
        console.log(`\n⚠️  ${alreadyInProd.length} événements DEJA présents en Production (doublons potentiels) :`);
        alreadyInProd.forEach(e => console.log(`   - ${e.titre}`));
    }
}

checkQueueAnalysis();
