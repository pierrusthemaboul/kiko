
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import 'dotenv/config';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function generateNewEvents() {
  console.log("🚀 Initialisation du générateur d'événements inédits...");

  // 1. Lire les règles et les titres existants
  const rules = fs.readFileSync('machine_a_evenements/choix_des_evenements.md', 'utf8');
  const existingTitles = JSON.parse(fs.readFileSync('machine_a_evenements/existing_titles.json', 'utf8'));

  // On réduit la liste envoyée pour pas saturer, ou on prend un échantillon si c'est trop gros.
  // Ici on envoie tout car 2000 titres c'est raisonnable pour Gemini.

  const prompt = `
Tu es l'unité de génération de la Machine Kiko. 
Ton but est de trouver 20 nouveaux événements MAJEURS de l'Histoire de France.

CONTEXTE :
Voici les règles de sélection à respecter impérativement :
${rules}

VOICI LES TITRES DÉJÀ PRÉSENTS (NE PAS LES RÉPÉTER ET NE PAS CRÉER DE DOUBLONS SÉMANTIQUES) :
${existingTitles.join(', ')}

MISSION :
Génère 20 événements inédits, majeurs, et visuellement riches pour le pipeline sevent3.

⚠️ RÈGLES STRICTES DE DATATION ET TITRAGE :
1. L'année (year) DOIT être historiquement exacte à 100%. Pas d'approximation.
2. Le "titre" doit être AUTO-SUFFISANT. Il ne doit pas être générique (interdit: "Élections", "Guerre", "Explosion"). Ajoute toujours la précision nécessaire (qui, quoi, où).
3. Le "titre" ne doit JAMAIS contenir de date explicite (pas de "(1910)" dans le titre).
4. Le "titre" doit faire maximum 60 caractères tout en restant très précis.

FORMAT JSON REQUIS :
{
  "new_events": [
    {
      "titre": "...",
      "year": 1234,
      "type": "...",
      "region": "France",
      "description": "Description visuelle concrète orientée matériaux et ambiance pour Flux (min 200 caractères)",
      "notoriete": 80
    }
  ]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const jsonMatch = response.match(/\{.*\}/s);
    const data = JSON.parse(jsonMatch[0]);

    console.log(`\n✨ J'ai trouvé ${data.new_events.length} nouveaux événements !`);

    data.new_events.forEach((ev, i) => {
      console.log(`${i + 1}. [${ev.year}] ${ev.titre} (Notoriété: ${ev.notoriete})`);
    });

    // Sauvegarde temporaire pour validation
    fs.writeFileSync('machine_a_evenements/proposition_batch.json', JSON.stringify(data, null, 2));
    console.log("\n📁 Proposition sauvegardée dans 'machine_a_evenements/proposition_batch.json'");
    console.log("Tape 'OUI' pour les insérer dans la table queue_sevent.");

  } catch (e) {
    console.error("❌ Erreur pendant la génération :", e.message);
  }
}

generateNewEvents();
