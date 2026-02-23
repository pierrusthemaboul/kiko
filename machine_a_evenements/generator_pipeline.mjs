
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import 'dotenv/config';
import { checkRobustDuplicate } from './check_robust.mjs';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function runGenerator(count = 20, theme = "Histoire de France") {
    console.log(`\n🚀 Lancement du Générateur (Etape 1) - Thème: ${theme}`);

    // 1. Lire les règles pour les fournir à l'IA
    const rules = fs.readFileSync('machine_a_evenements/choix_des_evenements.md', 'utf8');

    const prompt = `
Tu es le cerveau "Idéateur" du jeu Kiko. 
Ta mission : Générer ${count} événements historiques MAJEURS et UNIQUES.

THÈME : ${theme}

RÈGLES DE SÉLECTION (À respecter scrupuleusement) :
${rules}

CONSIGNE SUPPLÉMENTAIRE :
- Choisis des événements emblématiques qui marquent la mémoire collective.
- Ne propose pas d'événements trop obscurs.
- TITRE : TRÈS COURT (Maximum 50 caractères). Ne mets pas de description dans le titre.
- La description doit être VISUELLE (matériaux, lumières, cadrage) pour aider la génération d'image ultérieure.

FORMAT JSON :
{
  "events": [
    {
      "titre": "L'Assassinat d'Henri IV",
      "year": 1610,
      "type": "Politique",
      "region": "France",
      "description": "...",
      "notoriete": 95
    }
  ]
}
`;

    try {
        console.log("📡 Demande de génération à Gemini...");
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text());

        let addedCount = 0;
        let duplicateCount = 0;

        for (const ev of data.events) {
            console.log(`\n--- Analyse de : "${ev.titre}" (${ev.year}) ---`);

            // 2. Vérification sémantique contre la table 'evenements'
            const check = await checkRobustDuplicate(ev.titre, ev.year);

            if (check.isDuplicate) {
                console.log(`⏩ Rejeté (Doublon de: ${check.match})`);
                duplicateCount++;
                continue;
            }

            // 3. Insertion dans la file d'attente 'queue_sevent'
            const { error: insertError } = await supabase
                .from('queue_sevent')
                .insert([{
                    titre: ev.titre,
                    year: ev.year,
                    type: ev.type,
                    region: ev.region,
                    description: ev.description,
                    notoriete: ev.notoriete,
                    status: 'pending'
                }]);

            if (insertError) {
                console.error(`❌ Erreur d'insertion: ${insertError.message}`);
            } else {
                console.log(`✅ Ajouté à la file d'attente !`);
                addedCount++;
            }
        }

        console.log(`\n📊 RÉSUMÉ DU BATCH :`);
        console.log(`- Nouveaux ajoutés: ${addedCount}`);
        console.log(`- Doublons rejetés: ${duplicateCount}`);

    } catch (e) {
        console.error("❌ Erreur critique:", e.message);
    }
}

// Récupération des arguments
const count = parseInt(process.argv[2]) || 10;
const theme = process.argv.slice(3).join(' ') || "Histoire de France";

runGenerator(count, theme);
