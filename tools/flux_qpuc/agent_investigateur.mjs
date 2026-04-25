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
Agis comme un ingénieur de données et historien expert. Ton rôle est de générer une liste de titres d'événements historiques servant de clés d'indexation.

RÈGLES DE DIVERSITÉ (ANTY-BOUCLE) :
1. Si le thème est très connu (ex: Révolution Française, Paris), évite les 'évidences' que tout le monde connaît déjà.
2. Va chercher la 'seconde couche' de l'histoire : événements parlementaires, décrets précis, batailles secondaires, innovations techniques.
3. Ne propose JAMAIS deux fois le même événement dans une réponse.

Spécifications techniques :
1. CHRONOLOGIE : Strictement après l'an 1.
2. TITRE : Précis + Année à la fin. Format : [Titre de l'événement précis] [Année]
3. PRÉCISION : Utilise uniquement des verbes d'action déclencheurs (Inauguration, Signature, Décret, Sacre, Décès).
4. UNICITÉ : Sujet/Acteur obligatoire (ex: 'Exécution de Louis XVI' et non 'Exécution').
`;

async function findEventsForTheme(theme, count = 5) {
  const archive = await getLatestArchiveContext();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: SYSTEM_PROMPT });

  const prompt = `Génère ${count} événements historiques précis liés au thème : "${theme}".
  
  CONSIGNES :
  - Chaque titre doit inclure l'année (ex: "Prise de la Bastille 1789").
  - Sois extrêmement spécifique (Inauguration, Signature, Pose de pierre...).
  - Utilise le fichier d'archives pour éviter les doublons.
  
  Format attendu (JSON STRICT) :
  {
    "events": [
      {
        "titre": "[Titre de l'événement précis] [Année]", 
        "year": 1789, 
        "description": "...", 
        "wikidata_id": "Q...", 
        "wikipedia_title": "Nom de l'article fr"
      }
    ]
  }`;

  let parts = [{ text: prompt }];
  if (archive && archive.fileUri) {
      parts.unshift({ fileData: { mimeType: "text/plain", fileUri: archive.fileUri } });
  }

  try {
    const result = await model.generateContent(parts);
    const rawText = result.response.text();
    
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Format JSON introuvable");
    
    const data = JSON.parse(match[0]);
    return {
        events: data.events || [],
        prompt: prompt,
        response: rawText
    };
  } catch (err) {
    console.error("❌ [INVESTIGATEUR] Erreur :", err.message);
    return { events: [], prompt: prompt, response: "ERREUR API: " + err.message };
  }
}

export { findEventsForTheme };
