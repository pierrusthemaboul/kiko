import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProdDb, assertSupabaseConfig } from './tempete/supabase.mjs';
import { syncAllEmbeddings } from './tempete/embeddings.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
    assertSupabaseConfig();
    const db = getProdDb();

    console.log("🧹 1. Suppression des anciens embeddings en production...");
    const { error: delError } = await db.from('evenements_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Astuce pour tout supprimer proprement
    if (delError) {
        console.error("❌ Erreur pendant la suppression :", delError);
        return;
    }
    console.log("✅ Anciens embeddings supprimés !");

    console.log("\n🚀 2. Génération des nouveaux embeddings via OpenAI (text-embedding-3-small)...");
    const result = await syncAllEmbeddings({
        maxLocal: 0, // On ne synchronise pas le labo pour l'instant
        prodBatchSize: 100, // Ajustable pour limiter les requêtes
        onProdProgress: (stats) => {
            console.log(`[PROD] Progession : ${stats.done} / ${stats.total}`);
        }
    });

    if (result.prod && result.prod.error) {
        console.error("\n❌ Erreur pendant la génération :", result.prod.error);
    } else {
        console.log("\n🎉 Génération terminée !");
    }
}

main();

