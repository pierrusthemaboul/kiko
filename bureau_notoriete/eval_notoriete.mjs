import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabase } from '../machine_a_evenements/AGENTS/shared_utils.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const INSTRUCTIONS = fs.readFileSync(path.join(__dirname, 'AGENTS/NOTOREX.md'), 'utf-8');

const BATCH_SIZE = 20; // Nombre d'événements par appel Gemini

async function evaluateBatch(events) {
    const prompt = `${INSTRUCTIONS}
    
Voici les événements à analyser :
${JSON.stringify(events.map(e => ({ id: e.id, titre: e.titre, date: e.date, current: e.notoriete })), null, 2)}

Réponds UNIQUEMENT avec un tableau JSON d'objets contenant {id, score, reason}.`;

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1 // On veut de la cohérence, pas de la créativité sauvage
            }
        });
        const responseText = result.response.text();
        return JSON.parse(responseText);
    } catch (e) {
        console.error("❌ Erreur Gemini:", e.message);
        return [];
    }
}

async function run() {
    const supabase = getSupabase('prod');

    console.log("📊 Lancement de l'évaluation de la notoriété (Mode: notoriete_fr)...");

    // On compte combien d'événements n'ont pas encore de score FR
    const { count, error: countError } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .is('notoriete_fr', null);

    if (countError) {
        console.error("❌ Erreur Supabase Count:", countError.message);
        return;
    }

    console.log(`🎯 Événements à traiter (notoriete_fr est null) : ${count}`);

    let processedTotal = 0;
    let hasMore = true;

    while (hasMore) {
        // Sélection du prochain lot : uniquement ceux qui n'ont pas encore de score FR
        const { data: events, error } = await supabase
            .from('evenements')
            .select('id, titre, date, notoriete')
            .is('notoriete_fr', null)
            .limit(BATCH_SIZE);

        if (error) {
            console.error("❌ Erreur Fetch:", error.message);
            break;
        }

        if (!events || events.length === 0) {
            console.log("✅ Tous les événements ont maintenant un score notoriete_fr.");
            hasMore = false;
            break;
        }

        console.log(`\n📦 Batch [${processedTotal + 1} à ${processedTotal + events.length}] / ${count}...`);
        const results = await evaluateBatch(events);

        if (results.length === 0) {
            console.log("⚠️ Batch vide renvoyé par l'IA, on réessaye.");
            continue;
        }

        const updates = results.map(async (res) => {
            const original = events.find(e => e.id === res.id);
            if (!original) return;

            const { error: updateError } = await supabase
                .from('evenements')
                .update({
                    notoriete_fr: res.score,
                    notoriete_source: `NOTOREX (FR): ${res.reason}`,
                    notoriete_updated_at: new Date().toISOString()
                })
                .eq('id', res.id);

            if (updateError) {
                console.error(`❌ Erreur update ${res.id}:`, updateError.message);
            } else {
                console.log(`   ✅ [FR: ${res.score}] ${original.titre.substring(0, 40)}...`);
            }
        });

        await Promise.all(updates);
        processedTotal += events.length;

        // Petite pause pour ne pas saturer l'API
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n🏁 Terminé ! ${processedTotal} événements ont été mis à jour dans 'notoriete_fr'.`);
}

run();
