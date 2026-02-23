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

async function cleanupQueueComplete() {
    console.log("🧹 [NETTOYAGE COMPLET] Analyse exhaustive de la production...");

    let allExisting = [];
    let from = 0;
    let to = 999;
    let finished = false;

    while (!finished) {
        const { data, error } = await supabase
            .from('evenements')
            .select('titre, date_formatee')
            .range(from, to);

        if (error) {
            console.error("❌ Erreur lecture production:", error.message);
            break;
        }

        if (data.length === 0) {
            finished = true;
        } else {
            allExisting = allExisting.concat(data);
            from += 1000;
            to += 1000;
        }
    }

    const existingSet = new Set(allExisting.map(e => `${e.titre.trim().toLowerCase()}|${e.date_formatee}`));
    console.log(`📦 ${allExisting.length} événements chargés depuis la production.`);

    const { data: queueItems } = await supabase.from('queue_sevent').select('*');
    console.log(`📑 ${queueItems.length} événements dans la file d'attente.`);

    let removedCount = 0;
    for (const item of queueItems) {
        const key = `${item.titre.trim().toLowerCase()}|${item.year}`;
        if (existingSet.has(key)) {
            await supabase.from('queue_sevent').delete().eq('id', item.id);
            removedCount++;
        }
    }

    console.log(`✅ Doublons réels supprimés : ${removedCount}`);
    console.log(`✨ File d'attente finale propre.`);
}

cleanupQueueComplete();
