import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Chargement explicite du .env depuis la racine
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * 🕶️ AGENT VEILLEUR (Détection de Doublons Sémantiques)
 * 🔬 Rôle : Générer des embeddings et comparer avec la base PGVector.
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("❌ [CRITIQUE] supabaseUrl est requis ! (Agent Veilleur)");
} else if (!supabaseKey) {
  console.error("❌ [CRITIQUE] supabaseKey est manquante ! (Agent Veilleur)");
} else {
  console.log(`🔗 [VEILLEUR] Connexion Supabase (URL: ${supabaseUrl.substring(0, 20)}..., Key: ${supabaseKey.substring(0, 10)}...)`);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateEmbedding(text) {
  try {
    // Utiliser text-embedding-3-small (1536 dimensions)
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("❌ Erreur Veilleur (Embedding OpenAI):", err.message);
    return null;
  }
}

async function checkDuplicates(titre, description, date) {
    console.log(`🕶️ [VEILLEUR] Recherche sémantique pour "${titre}"...`);
    
    // 1. Génération de l'embedding pour le nouvel événement (TITRE UNIQUEMENT pour la robustesse)
    const embedding = await generateEmbedding(titre);
    if (!embedding) {
        console.log("⚠️ [VEILLEUR] Impossible de générer l'embedding, passage au doublon sémantique désactivé.");
        return false;
    }

    try {
        // 2. Recherche vectorielle dans PRODUCTION (via match_events)
        const { data: similarProd, error: prodError } = await supabase
            .rpc('match_events', {
                query_embedding: embedding,
                match_threshold: 0.85,
                match_count: 3
            });
        
        if (prodError) {
            console.error(`❌ Erreur Veilleur (Production Search): ${prodError.message}`);
            // On continue si possible
        } else if (similarProd && similarProd.length > 0) {
            const bestMatch = similarProd[0];
            console.log(`🚩 [DOUBLON PRODUCTION] "${titre}" ressemble à "${bestMatch.titre}" (Score: ${(bestMatch.similarity || 0).toFixed(3)})`);
            return true;
        }

        // 3. Recherche vectorielle dans SAS (via match_sas)
        const { data: similarSas, error: sasError } = await supabase
            .rpc('match_sas', {
                query_embedding: embedding,
                match_threshold: 0.85,
                match_count: 3
            });

        if (sasError) {
            console.error(`❌ Erreur Veilleur (SAS Search): ${sasError.message}`);
        } else if (similarSas && similarSas.length > 0) {
            const bestMatch = similarSas[0];
            console.log(`🚩 [DOUBLON SAS] "${titre}" ressemble à "${bestMatch.titre}" (Score: ${(bestMatch.similarity || 0).toFixed(3)})`);
            return true;
        }

        // 4. Recherche vectorielle dans SAS_TEST (via match_sas_test)
        const { data: similarSasTest, error: sasTestError } = await supabase
            .rpc('match_sas_test', {
                query_embedding: embedding,
                match_threshold: 0.85,
                match_count: 3
            });

        if (sasTestError) {
            console.error(`❌ Erreur Veilleur (SAS_TEST Search): ${sasTestError.message}`);
        } else if (similarSasTest && similarSasTest.length > 0) {
            const bestMatch = similarSasTest[0];
            console.log(`🚩 [DOUBLON SAS_TEST] "${titre}" ressemble à "${bestMatch.titre}" (Score: ${(bestMatch.similarity || 0).toFixed(3)})`);
            return true;
        }

        console.log(`✅ [VEILLEUR] Aucun doublon critique trouvé.`);
        return false;
    } catch (err) {
        console.error("❌ Erreur Critique Veilleur:", err.message);
        throw err;
    }
}

// Fonction pour calculer la similarité cosine
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export { checkDuplicates, generateEmbedding };
