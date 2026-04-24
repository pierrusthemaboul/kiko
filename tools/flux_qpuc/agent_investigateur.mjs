import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLatestArchiveContext } from './agent_rag_manager.mjs';

// Chargement explicite du .env depuis la racine
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error("❌ [CRITIQUE] supabaseUrl est requis !");
} else if (!supabaseKey) {
  console.error("❌ [CRITIQUE] supabaseKey est manquante !");
} else {
  console.log(`🔗 [INIT] Connexion Supabase (URL: ${supabaseUrl.substring(0, 20)}..., Key: ${supabaseKey.substring(0, 10)}...)`);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
Tu es l'Expert Curateur Historique pour KIKO. Ta mission est de générer des événements d'une qualité académique irréprochable.

RÈGLES CRITIQUES (ZÉRO TOLÉRANCE) :
1. LANGUE : Tous les TITRES et DESCRIPTIONS doivent être en FRANÇAIS. (Ex: 'Bataille de Tours' et JAMAIS 'Battle of Tours').
2. ÈRE CHRÉTIENNE : Uniquement des événements APRÈS J.-C. (Année >= 1). Si le thème est antique, reste dans la période impériale romaine tardive ou rejette.
3. SINGULARITÉ : L'événement doit être un POINT dans le temps (une date précise), pas une période ou une durée.
   - OUI : 'Sacre de Charlemagne', 'Bataille de Castillon', 'Mort de Jeanne d'Arc'.
   - NON : 'Règne de Louis XIV', 'Guerre de Cent Ans', 'Construction de la cathédrale' (si ça prend 100 ans).
4. TITRES CANONIQUES : Utilise le nom le plus courant en France. Sois conscient des synonymes (Ex: 'Prise de Constantinople' et 'Chute de Constantinople' sont le même événement en 1453).
5. FORMAT TITRE : Max 50 caractères. Jamais de date dans le titre. Pas de ponctuation inutile.

CRITÈRE DE SÉLECTION :
Privilégie les "événements-points" : Traités, Batailles (fin ou début précis), Sacres, Décès célèbres, Inventions datables, Fondations.
`;

async function findEventsForTheme(theme, count = 5) {
  console.log(`🔍 [INVESTIGATEUR] Recherche thématique : "${theme}"...`);
  
  const archive = await getLatestArchiveContext();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: SYSTEM_PROMPT });

  const prompt = `Génère ${count} événements historiques PONCTUELS liés au thème : "${theme}".
  
  RÈGLE NOUVEAUTÉ (RAG) : Utilise le fichier d'archives joint pour éviter les doublons.
  
  Format attendu (JSON STRICT) :
  {
    "events": [
      {
        "titre": "...", 
        "year": 1789, 
        "description": "...", 
        "wikidata_id": "Q...", 
        "wikipedia_title": "Nom de l'article fr"
      }
    ]
  }`;

  try {
    console.log(`🤖 [IA] Génération pour "${theme}" avec RAG...`);
    
    let parts = [{ text: prompt }];
    if (archive && archive.fileUri) {
        parts.unshift({ fileData: { mimeType: "text/plain", fileUri: archive.fileUri } });
    }

    console.log(`   💬 [PROMPT GEMINI] "${prompt.substring(0, 100)}..."`);
    
    const result = await model.generateContent(parts);
    const rawText = result.response.text();
    
    console.log(`   🗨️ [RÉPONSE BRUTE GEMINI] ${rawText.substring(0, 200)}...`);

    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Format JSON introuvable");
    
    const data = JSON.parse(match[0]);
    console.log(`✅ [INVESTIGATEUR] ${data.events?.length || 0} candidats trouvés.`);
    return data.events || [];
  } catch (err) {
    console.error("❌ [INVESTIGATEUR] Erreur :", err.message);
    return [];
  }
}

export { findEventsForTheme };
