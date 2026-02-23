import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// PROD
const prodUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const prodKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const prod = createClient(prodUrl, prodKey);

// LOCAL (Docker / Supabase CLI default)
const localUrl = 'http://127.0.0.1:54321';
const localKey = 'process.env.SUPABASE_SERVICE_ROLE_KEY'; // Service role du tutoriel/standard local
const local = createClient(localUrl, localKey);

async function synchronizeQueues() {
    console.log("🚚 [SYNCHRONISATION] Transfert Local queue_sevent ➔ Production queue_sevent...");

    // 1. Lire le local
    const { data: localEvents, error: localError } = await local
        .from('queue_sevent')
        .select('*')
        .eq('status', 'pending');

    if (localError) {
        console.error("❌ Erreur lecture local:", localError.message);
        return;
    }

    if (!localEvents || localEvents.length === 0) {
        console.log("∅ Aucun événement en attente en local.");
    } else {
        console.log(`📦 ${localEvents.length} événements trouvés en local.`);

        // 2. Insérer en prod
        const { error: prodError } = await prod
            .from('queue_sevent')
            .insert(localEvents.map(e => ({
                titre: e.titre,
                year: e.year,
                description: e.description,
                type: e.type,
                region: e.region,
                status: 'pending',
                notoriete: e.notoriete
            })));

        if (prodError) {
            console.error("❌ Erreur insertion prod:", prodError.message);
        } else {
            console.log(`✅ ${localEvents.length} événements transférés en prod.`);
            // Optionnel : vider le local pour éviter les doublons
            await local.from('queue_sevent').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            console.log("🗑️ File d'attente locale vidée.");
        }
    }

    // --- FIX DES URLS LOCALES EN PROD ---
    console.log("\n🔍 [FIX URLS] Recherche d'images pointant vers 127.0.0.1 en production...");

    // On cherche dans la table "evenements" de PRODUCTION
    const { data: brokenEvents, error: searchError } = await prod
        .from('evenements')
        .select('id, titre, illustration_url, date, description_detaillee, epoque, region, notoriete')
        .ilike('illustration_url', '%127.0.0.1%');

    if (searchError) {
        console.error("❌ Erreur recherche URLs cassées:", searchError.message);
        return;
    }

    if (!brokenEvents || brokenEvents.length === 0) {
        console.log("✅ Aucune URL locale (127.0.0.1) trouvée en production.");
    } else {
        console.log(`⚠️ ${brokenEvents.length} événements ont une illustration locale cassée.`);

        for (const event of brokenEvents) {
            console.log(`🛠️ Récupération de : "${event.titre}"...`);

            // 1. On vide l'URL en prod
            await prod.from('evenements').update({ illustration_url: null }).eq('id', event.id);

            // 2. On l'ajoute à la queue de prod pour qu'il ait une vraie image
            await prod.from('queue_sevent').insert([{
                titre: event.titre,
                year: parseInt(event.date.split('-')[0]),
                description: event.description_detaillee || event.titre,
                type: event.epoque || 'Histoire', // On met quelque chose par défaut
                region: event.region || 'Monde',
                status: 'pending',
                notoriete: event.notoriete || 50
            }]);
        }
        console.log(`✨ Les ${brokenEvents.length} événements cassés ont été remis en file d'attente pour de vraies images.`);
    }
}

synchronizeQueues();
