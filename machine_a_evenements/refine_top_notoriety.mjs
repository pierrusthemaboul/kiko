import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabase } from './AGENTS/shared_utils.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const supabase = getSupabase('prod');

async function runRefinement() {
    const MIN_SCORE = 60;
    const MAX_SCORE = 80;
    console.log(`🧐 Analyse des événements de la tranche [${MIN_SCORE}-${MAX_SCORE}]...`);

    // 1. Récupérer les événements de la tranche
    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, date, notoriete_fr, description_detaillee, illustration_url')
        .gte('notoriete_fr', MIN_SCORE)
        .lt('notoriete_fr', MAX_SCORE)
        .order('notoriete_fr', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`📊 ${events.length} événements de haute notoriété trouvés.`);

    // 2. Regrouper par année pour détecter les doublons sémantiques
    const byYear = {};
    events.forEach(e => {
        const year = new Date(e.date).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(e);
    });

    const duplicatesToRemove = [];
    const updatedScores = [];

    // 3. Traitement par lots d'années pour éviter le 429
    const yearsWithDupes = Object.keys(byYear).filter(y => byYear[y].length > 1);
    console.log(`🔎 Analyse de ${yearsWithDupes.length} années suspectes...`);

    const YEAR_BATCH_SIZE = 10;
    for (let i = 0; i < yearsWithDupes.length; i += YEAR_BATCH_SIZE) {
        const batchYears = yearsWithDupes.slice(i, i + YEAR_BATCH_SIZE);
        const batchData = batchYears.map(y => ({ year: y, events: byYear[y].map(e => ({ id: e.id, titre: e.titre })) }));

        const prompt = `Tu es un expert en curation de données historiques.
Voici plusieurs groupes d'événements, classés par année.
Pour chaque année, identifie si certains événements sont des doublons sémantiques (ils parlent du même fait).

GROUPES :
${JSON.stringify(batchData, null, 2)}

MISSION :
1. Pour CHAQUE année, liste les IDs des doublons à SUPPRIMER.
2. Ne garde qu'un seul ID par fait historique unique.

RÉPONDS UNIQUEMENT EN JSON :
{
  "duplicates_to_delete": ["id1", "id2", "..."]
}`;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Format JSON non trouvé");

            const decision = JSON.parse(jsonMatch[0]);
            if (decision.duplicates_to_delete && decision.duplicates_to_delete.length > 0) {
                duplicatesToRemove.push(...decision.duplicates_to_delete);
                console.log(`   👯 Batch ${Math.floor(i / YEAR_BATCH_SIZE) + 1} : ${decision.duplicates_to_delete.length} doublons identifiés.`);
            }
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            console.error(`Erreur dédoublonnage batch ${i / YEAR_BATCH_SIZE + 1} :`, e.message);
        }
    }

    // 4. Suppression des doublons
    if (duplicatesToRemove.length > 0) {
        console.log(`🚀 Suppression de ${duplicatesToRemove.length} doublons sémantiques...`);
        const { error: delError } = await supabase.from('evenements').delete().in('id', duplicatesToRemove);
        if (delError) console.error("Erreur suppression:", delError.message);
    } else {
        console.log("✅ Aucun doublon sémantique à supprimer.");
    }

    // 5. Harmonisation des scores (Top 100)
    const survivors = events.filter(e => !duplicatesToRemove.includes(e.id));
    console.log(`⚖️ Harmonisation des scores pour les ${survivors.length} survivants...`);

    for (let i = 0; i < survivors.length; i += 30) {
        const batch = survivors.slice(i, i + 30);
        const prompt = `Tu es NOTOREX, expert en notoriété française.
Re-calibre les scores de notoriété (0-100) de ces événements pour qu'ils soient cohérents entre eux.

RÈGLES :
- 100 : Piliers absolus (Max 5-10 sur toute la base).
- 90-99 : Événements massifs connus de tous les Français.
- 80-89 : Très fort, base de culture générale.

LISTE :
${JSON.stringify(batch.map(e => ({ id: e.id, titre: e.titre, current: e.notoriete_fr })), null, 2)}

RÉPONDS UNIQUEMENT EN JSON :
{
  "rankings": [
    { "id": "uuid", "new_score": integer, "reason": "string" }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Format JSON non trouvé");

            const data = JSON.parse(jsonMatch[0]);

            if (data.rankings && Array.isArray(data.rankings)) {
                for (const rank of data.rankings) {
                    const { error: upError } = await supabase
                        .from('evenements')
                        .update({
                            notoriete_fr: rank.new_score,
                            notoriete_source: `NOTOREX (RANKED): ${rank.reason}`
                        })
                        .eq('id', rank.id);
                    if (!upError) console.log(`   ✅ [${rank.new_score}] ${rank.id.substring(0, 8)}... : ${rank.reason}`);
                }
            }
            await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
            console.error("Erreur harmonisation :", e.message);
        }
    }

    console.log("🏁 Fin de l'harmonisation.");
}

runRefinement();
