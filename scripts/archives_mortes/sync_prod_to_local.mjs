import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Production (Source)
const PROD_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const PROD_KEY = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const prod = createClient(PROD_URL, PROD_KEY);

// Local (Destination)
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const local = createClient(LOCAL_URL, LOCAL_KEY);

async function getAllProdData(tableName) {
    let allData = [];
    let from = 0;
    let to = 999;
    let finished = false;

    console.log(`📥 Récupération des données de ${tableName} par blocs de 1000...`);

    while (!finished) {
        const { data, error } = await prod
            .from(tableName)
            .select('*')
            .range(from, to)
            .order('id', { ascending: true }); // Important pour la pagination

        if (error) {
            console.error(`❌ Erreur prod [${tableName}]:`, error.message);
            break;
        }

        if (!data || data.length === 0) {
            finished = true;
        } else {
            allData = allData.concat(data);
            console.log(`   Fetched ${allData.length} records...`);
            if (data.length < 1000) {
                finished = true;
            } else {
                from += 1000;
                to += 1000;
            }
        }
    }
    return allData;
}

async function syncTable(tableName) {
    console.log(`\n🔄 Synchronisation [${tableName}] : Production ➔ Local...`);

    // Preuve : Compter en local avant
    const { count: localCountBefore } = await local.from(tableName).select('*', { count: 'exact', head: true });

    const prodData = await getAllProdData(tableName);

    if (prodData.length === 0) {
        console.log(`ℹ️ La table ${tableName} en production est vide.`);
        return;
    }

    console.log(`📋 Preuve : ${prodData.length} événements trouvés en PRODUCTION.`);
    console.log(`🏠 État local actuel : ${localCountBefore || 0} événements.`);

    // Insertion par blocs en local pour plus de fiabilité
    const batchSize = 500;
    for (let i = 0; i < prodData.length; i += batchSize) {
        const batch = prodData.slice(i, i + batchSize);
        const { error } = await local.from(tableName).upsert(batch, { onConflict: 'id' });
        if (error) {
            console.error(`❌ Erreur insertion local [${tableName}]:`, error.message);
            break;
        }
    }

    // Preuve : Compter en local après
    const { count: localCountAfter } = await local.from(tableName).select('*', { count: 'exact', head: true });
    console.log(`✅ ${tableName} synchronisée : ${localCountAfter} événements en local désormais.`);
}

async function runSync() {
    console.log('🚀 Lancement de la synchronisation de la table [evenements] Prod -> Local...');

    await syncTable('evenements');
    // await syncTable('goju2'); // Désactivé pour protéger les créations locales en cours

    const { count: totalEv } = await local.from('evenements').select('*', { count: 'exact', head: true });
    console.log(`\n✨ SYNC TERMINÉE : Ta base locale contient désormais ${totalEv} archives historiques.`);
}

runSync();
