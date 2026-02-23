import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });

async function evalQuality() {
    console.log("📥 Récupération de 100 événements aléatoires depuis Supabase...");

    // Pour prendre 100 événements aléatoires, on pourrait requêter tous les IDs puis tirer au sort,
    // Mais pour faire simple, on récupère un gros bloc et on mélange.
    const { data: allEvents, error } = await supabase
        .from('evenements')
        .select('id, titre, date, description_detaillee')
        .limit(1000);

    if (error) {
        console.error("❌ Erreur Supabase:", error.message);
        return;
    }

    // Mélanger le tableau
    for (let i = allEvents.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allEvents[i], allEvents[j]] = [allEvents[j], allEvents[i]]; // Swap
    }

    const sample = allEvents.slice(0, 100);
    console.log(`✅ ${sample.length} événements sélectionnés.`);
    console.log(`🧠 Évaluation par Gemini 2.0 Flash (par lots de 25)...`);

    let stats = {
        total: 100,
        parfaits: 0,
        erreurs_date: 0,
        titres_imprecis: 0,
        descriptions_moyennes: 0
    };

    const batchSize = 25;

    for (let i = 0; i < sample.length; i += batchSize) {
        const batch = sample.slice(i, i + batchSize);
        process.stdout.write(`Évaluation lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(sample.length / batchSize)}...`);

        const prompt = `Tu es un Auditeur Historique de qualité.
Évalue ces événements. Donne une note de qualité pour chaque événement et liste les problèmes trouvés (s'il y en a).
1. "date_fausse" : L'année ne correspond pas à la réalité historique (tolérance 1 an).
2. "titre_imprecis" : Le titre manque de précision (quoi, où).
3. "description_moyenne" : La description manque de contexte, cause ou conséquence.

EVENEMENTS:
${JSON.stringify(batch.map(e => ({ id: e.id, titre: e.titre, date: e.date, description: e.description_detaillee })))}

FORMAT:
{
  "evaluations": [
    {
      "id": "...",
      "est_parfait": true/false, // true si AUCUNE erreur
      "problemes_detectes": ["date_fausse", "titre_imprecis", "description_moyenne"], // Vide si parfait
      "justification_si_erreur": "..."
    }
  ]
}
`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());

            if (data.evaluations) {
                for (let ev of data.evaluations) {
                    if (ev.est_parfait) stats.parfaits++;
                    if (!ev.est_parfait && ev.problemes_detectes) {
                        if (ev.problemes_detectes.includes('date_fausse')) stats.erreurs_date++;
                        if (ev.problemes_detectes.includes('titre_imprecis')) stats.titres_imprecis++;
                        if (ev.problemes_detectes.includes('description_moyenne')) stats.descriptions_moyennes++;
                    }
                }
            }
            console.log(` Terminé.`);
        } catch (e) {
            console.log(` ❌ Erreur API (${e.message})`);
        }
        await new Promise(r => setTimeout(r, 2000)); // Pause anti-rate limit
    }

    console.log(`\n========================================`);
    console.log(`📊 RÉSULTAT DU CONTRÔLE QUALITÉ (Sur ${stats.total} événements) :`);
    console.log(`   ✅ Parfaits : ${stats.parfaits} / ${stats.total}`);
    console.log(`   📅 Erreurs de date estimées : ${stats.erreurs_date}`);
    console.log(`   🏷️ Titres imprécis estimées : ${stats.titres_imprecis}`);
    console.log(`   📝 Descriptions moyennes estimées : ${stats.descriptions_moyennes}`);
    console.log(`========================================`);

    // Note globale
    const percentage = (stats.parfaits / stats.total) * 100;
    if (percentage > 90) console.log("🌟 SCORE EXCELLENT : Ta base est saine !");
    else if (percentage > 70) console.log("👍 SCORE BON : Quelques petites imperfections, mais c'est très solide.");
    else console.log("⚠️ SCORE MOYEN : Il reste pas mal de choses à lisser.");
}

evalQuality();
