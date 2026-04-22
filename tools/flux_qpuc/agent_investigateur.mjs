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
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("❌ [CRITIQUE] supabaseUrl est requis ! Vérifiez vos variables d'environnement (SUPABASE_URL, VITE_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_URL)");
} else {
  console.log(`🔗 [INIT] Connexion Supabase à : ${supabaseUrl.substring(0, 25)}...`);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
Tu es l'Agent Investigateur pour KIKO. 
Ton rôle est d'extraire des événements historiques basés sur un thème "Quatre à la Suite" (QPUC).

RÈGLES D'OR :
1. PONCTUALITÉ : L'événement doit être daté par une ANNÉE UNIQUE (ex: 1789).
2. SINGULARITÉ : Pas d'événements avant Jésus Christ (Année >= 1). 
3. TITRE INTEMPOREL : Max 50 car. Jamais de date dans le titre. 
4. ÉVÉNEMENTS-POINTS : Choisis des sacres, traités, batailles, morts, découvertes, fondations.

WIKIDATA / WIKIPEDIA RÈGLE :
- Uniquement si tu es CERTAIN à 100% que l'ID correspond à l'événement PONCTUEL.
- wikipedia_title DOIT être le titre CANONIQUE de l'article fr (ex: 'Bataille de Waterloo' et NON 'Ouverture de la bataille').
- Si tu as un doute de 1%, laisse le champ vide "".
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

    const result = await model.generateContent(parts);
    const match = result.response.text().match(/\{[\s\S]*\}/);
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
