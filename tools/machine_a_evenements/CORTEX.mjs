import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

/**
 * 🧠 CORTEX : Outil de recherche intelligente
 */
export async function findSimilarEvents(queryText, threshold = 0.8, limit = 5) {
    console.log(`🧠 CORTEX : Recherche de similarité pour "${queryText}"...`);

    // 1. Vectorisation de la requête
    const res = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: queryText,
        dimensions: 1536
    });
    const queryVector = res.data[0].embedding;

    // 2. Recherche vectorielle sur Supabase (via RPC ou opérateur cosine)
    // Nous utilisons un template SQL standard pour Supabase
    const { data: matches, error } = await db.rpc('match_evenements_vocal', {
        query_embedding: queryVector,
        match_threshold: threshold,
        match_count: limit,
    });

    if (error) {
        console.error("❌ Erreur CORTEX:", error.message);
        return [];
    }

    return matches;
}

// --- TEST DIRECT SI LANCÉ ---
if (import.meta.url === `file://${process.argv[1]}`) {
    const testQuery = process.argv[2] || "Révolution française";
    findSimilarEvents(testQuery).then(results => {
        console.log(`\n🔍 Résultats pour "${testQuery}" :`);
        results.forEach((r, i) => {
            console.log(`${i + 1}. ${r.titre} (${(r.similarity * 100).toFixed(1)}%)`);
        });
    });
}

