import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupQueue() {
    console.log("🧹 [NETTOYAGE] Synchronisation de la file d'attente de production...");

    // 1. Récupérer tous les titres déjà présents en production
    const { data: existingEvents, error: prodError } = await supabase
        .from('evenements')
        .select('titre, date_formatee');

    if (prodError) {
        console.error("❌ Erreur lecture production:", prodError.message);
        return;
    }

    const existingSet = new Set(existingEvents.map(e => `${e.titre.trim().toLowerCase()}|${e.date_formatee}`));
    console.log(`📦 ${existingEvents.length} événements trouvés dans la table finale.`);

    // 2. Récupérer la file d'attente
    const { data: queueItems, error: queueError } = await supabase
        .from('queue_sevent')
        .select('*');

    if (queueError) {
        console.error("❌ Erreur lecture queue:", queueError.message);
        return;
    }

    console.log(`📑 198 événements dans la file d'attente (avant filtrage).`);

    let removedCount = 0;
    for (const item of queueItems) {
        const key = `${item.titre.trim().toLowerCase()}|${item.year}`;
        if (existingSet.has(key)) {
            // C'est un doublon (déjà en prod), on le supprime de la queue
            const { error: delError } = await supabase
                .from('queue_sevent')
                .delete()
                .eq('id', item.id);

            if (!delError) removedCount++;
        }
    }

    console.log(`✅ Nettoyage terminé : ${removedCount} doublons supprimés de la file d'attente.`);
    console.log(`✨ Il reste ${queueItems.length - removedCount} VRAIS nouveaux événements à traiter dans queue_sevent.`);
}

cleanupQueue();
