import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabase } from './AGENTS/shared_utils.mjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const supabase = getSupabase('prod');

async function run() {
    console.log("🧺 Nettoyage sémantique final (Tranche < 60)...");

    // 1. Récupérer tous les événements < 60 (Paginé)
    let allEvents = [];
    let from = 0;
    const PAGE_SIZE = 1000;
    while (true) {
        const { data: events, error } = await supabase
            .from('evenements')
            .select('id, titre, date')
            .lt('notoriete_fr', 60)
            .order('date', { ascending: true })
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            console.error(error);
            break;
        }
        allEvents = [...allEvents, ...events];
        if (events.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }

    console.log(`📊 ${allEvents.length} événements à analyser.`);

    // 2. Regrouper par année
    const byYear = {};
    allEvents.forEach(e => {
        const year = new Date(e.date).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(e);
    });

    const yearsWithDupes = Object.keys(byYear).filter(y => byYear[y].length > 1);
    console.log(`🔎 ${yearsWithDupes.length} années contiennent plusieurs événements.`);

    const duplicatesToRemove = [];
    const YEAR_BATCH_SIZE = 15; // Un peu plus grand pour aller plus vite

    for (let i = 0; i < yearsWithDupes.length; i += YEAR_BATCH_SIZE) {
        const batchYears = yearsWithDupes.slice(i, i + YEAR_BATCH_SIZE);
        const batchData = batchYears.map(y => ({
            year: y,
            events: byYear[y].map(e => ({ id: e.id, titre: e.titre }))
        }));

        process.stdout.write(`⏳ Analyse batch ${Math.floor(i / YEAR_BATCH_SIZE) + 1}/${Math.ceil(yearsWithDupes.length / YEAR_BATCH_SIZE)}... `);

        const prompt = `Tu es un expert en curation de données historiques.
Voici plusieurs groupes d'événements, classés par année.
Pour chaque année, identifie si certains événements sont des DOUBLONS SÉMANTIQUES (ils parlent du même fait historique, même si le titre diffère).

GROUPES :
${JSON.stringify(batchData, null, 2)}

MISSION :
1. Pour CHAQUE année, liste les IDs des doublons à SUPPRIMER.
2. Ne garde qu'un seul ID par fait historique unique.
3. Si les faits sont différents, ne liste rien.

RÉPONDS UNIQUEMENT EN JSON :
{
  "duplicates_to_delete": ["id1", "id2", "..."]
}`;

        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const decision = JSON.parse(jsonMatch[0]);
                if (decision.duplicates_to_delete && decision.duplicates_to_delete.length > 0) {
                    duplicatesToRemove.push(...decision.duplicates_to_delete);
                    process.stdout.write(`👯 ${decision.duplicates_to_delete.length} doublons trouvés.\n`);
                } else {
                    process.stdout.write("✅ OK\n");
                }
            } else {
                process.stdout.write("⚠️ Format JSON invalide\n");
            }
        } catch (e) {
            console.error(`\n❌ Erreur batch ${i / YEAR_BATCH_SIZE + 1}:`, e.message);
            if (e.message.includes('429')) {
                console.log("😴 Rate limit atteint, pause de 10s...");
                await new Promise(r => setTimeout(r, 10000));
            }
        }

        // Petite pause pour ménager l'API
        await new Promise(r => setTimeout(r, 1500));
    }

    if (duplicatesToRemove.length > 0) {
        console.log(`\n🚀 Suppression finale de ${duplicatesToRemove.length} doublons...`);
        for (let i = 0; i < duplicatesToRemove.length; i += 50) {
            const batch = duplicatesToRemove.slice(i, i + 50);
            const { error: delError } = await supabase.from('evenements').delete().in('id', batch);
            if (delError) console.error("Erreur suppression:", delError.message);
        }
    }

    console.log(`\n🏁 Nettoyage terminé. ${duplicatesToRemove.length} doublons supprimés.`);
}

run();
