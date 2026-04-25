import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSimilarity() {
    const titre1 = "Sac de Rome";
    const titre2 = "Sac de Rome par les Wisigoths d’Alaric";
    
    console.log(`Génération des embeddings pour :\n1. ${titre1}\n2. ${titre2}`);
    
    const res1 = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: titre1,
    });
    const emb1 = res1.data[0].embedding;

    const res2 = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: titre2,
    });
    const emb2 = res2.data[0].embedding;

    // Calcul de la similarité cosinus locale
    function dotProduct(a, b) {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }
    const similarity = dotProduct(emb1, emb2);
    console.log(`\nSimilarité calculée localement : ${similarity.toFixed(4)}`);

    // Test de l'RPC match_evenements_by_titre
    console.log("\nAppel de RPC match_evenements_by_titre avec l'embedding de 'Sac de Rome'...");
    const { data, error } = await supabase.rpc('match_evenements_by_titre', {
        query_embedding: emb1,
        match_threshold: 0.1, // Seuil bas pour voir ce qu'il trouve
        match_count: 5
    });

    if (error) {
        console.error("Erreur RPC:", error.message);
    } else {
        console.log("Résultats trouvés :");
        for (const item of data) {
            const { data: event } = await supabase.from('evenements').select('titre').eq('id', item.id).single();
            console.log(`- ${event?.titre} (Score: ${item.similarity.toFixed(4)})`);
        }
    }
}

testSimilarity();
