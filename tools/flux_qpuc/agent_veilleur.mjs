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
    
    try {
        // 1. Génération des embeddings
        const embeddingTitle = await generateEmbedding(titre);
        const combinedText = `${titre}: ${description}`;
        const embeddingCombined = await generateEmbedding(combinedText);

        if (!embeddingTitle || !embeddingCombined) {
            console.log("⚠️ [VEILLEUR] Impossible de générer les embeddings, passage au doublon sémantique désactivé.");
            return { isDuplicate: false, embedding: null };
        }

        // --- CHECK 1: PRODUCTION (Sidecar) ---
        
        // A. Par Titre
        const { data: similarProdTitre, error: prodTitreError } = await supabase
            .rpc('match_evenements_by_titre', {
                query_embedding: embeddingTitle,
                match_threshold: 0.85, // On remonte le seuil (plus strict)
                match_count: 5 // On en prend plusieurs pour filtrer par date
            });

        if (similarProdTitre?.length > 0) {
            for (const match of similarProdTitre) {
                const { data: event } = await supabase.from('evenements').select('titre, date').eq('id', match.id).single();
                if (event) {
                    const eventYear = new Date(event.date).getUTCFullYear();
                    const targetYear = new Date(date).getUTCFullYear();
                    // On ne rejette QUE si c'est le même titre ET la même année (+/- 1 an)
                    if (Math.abs(eventYear - targetYear) <= 1) {
                        const matchTitle = event.titre;
                        console.log(`🚩 [DOUBLON PRODUCTION TITRE] "${titre}" match avec "${matchTitle}" (${eventYear})`);
                        return { isDuplicate: true, embedding: embeddingTitle, matchTitle };
                    }
                }
            }
        }

        // B. Par Titre + Description
        const { data: similarProdCombined, error: prodCombinedError } = await supabase
            .rpc('match_evenements_by_titre_description', {
                query_embedding: embeddingCombined,
                match_threshold: 0.88, // Très strict pour le contexte
                match_count: 5
            });

        if (similarProdCombined?.length > 0) {
            for (const match of similarProdCombined) {
                const { data: event } = await supabase.from('evenements').select('titre, date').eq('id', match.id).single();
                if (event) {
                    const eventYear = new Date(event.date).getUTCFullYear();
                    const targetYear = new Date(date).getUTCFullYear();
                    if (Math.abs(eventYear - targetYear) <= 1) {
                        const matchTitle = event.titre;
                        console.log(`🚩 [DOUBLON PRODUCTION CONTEXTE] "${titre}" match avec "${matchTitle}" (${eventYear})`);
                        return { isDuplicate: true, embedding: embeddingTitle, matchTitle };
                    }
                }
            }
        }

        // --- CHECK 2: SAS (Staging) ---
        
        const { data: similarSas, error: sasError } = await supabase
            .rpc('match_sas', {
                query_embedding: embeddingTitle,
                match_threshold: 0.85,
                match_count: 5
            });

        if (similarSas?.length > 0) {
            for (const match of similarSas) {
                const eventYear = new Date(match.date).getUTCFullYear();
                const targetYear = new Date(date).getUTCFullYear();
                if (Math.abs(eventYear - targetYear) <= 1) {
                    const matchTitle = match.titre || "Élément du SAS";
                    console.log(`🚩 [DOUBLON SAS] "${titre}" déjà présent dans le SAS (${eventYear})`);
                    return { isDuplicate: true, embedding: embeddingTitle, matchTitle };
                }
            }
        }

        console.log(`✅ [VEILLEUR] Aucun doublon trouvé pour "${titre}" en ${new Date(date).getUTCFullYear()}.`);
        return { isDuplicate: false, embedding: embeddingTitle };
    } catch (error) {
        console.error("❌ [VEILLEUR] Erreur lors de la vérification des doublons:", error);
        return { isDuplicate: false, embedding: null };
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
