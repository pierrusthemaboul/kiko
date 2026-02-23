
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(supabaseUrl, supabaseKey);

async function getAnalysis(events, existingTitles) {
    const prompt = `
Expert Historien Kiko.
Analyse ces ${events.length} événements pour migration (goju2 -> evenements).

Items :
${events.map((e, i) => `${i}. ID: ${e.id} | Titre: ${e.titre} | Date: ${e.date}`).join('\n')}

Exclu ces titres (doublons) : ${existingTitles.slice(0, 100).join(', ')}...

Règles :
1. Consensus Historique (ex: Jeanne d'Arc = 1456).
2. Fusionner si sémantiquement identique.
3. Métadonnées : noting_score (1-100), niveau_difficulte (Facile, Moyen, Difficile), universel (bool), pays (ex: "France"), region, date_formatee (YYYY).

JSON UNIQUEMENT :
{
  "results": [
    {
      "source_id": "...",
      "action": "migrate" | "merge" | "reject",
      "final_data": { "titre": "...", "date": "YYYY-01-01", "date_formatee": "YYYY", "noting_score": 80, "niveau_difficulte": "Moyen", "universel": true, "pays": "France", "region": "Europe", "illustration_url": "..." },
      "merged_ids": [],
      "reason": "..."
    }
  ]
}
`;

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content);
}

async function runFullMigration() {
    console.log("🚀 Lancement de la migration finale (Loop Mode)...");
    let finished = false;
    let totalMigrated = 0;

    while (!finished) {
        const { data: items } = await supabase.from('goju2').select('*').eq('transferred', false).limit(40);

        if (!items || items.length === 0) {
            finished = true;
            break;
        }

        const { data: existing } = await supabase.from('evenements').select('titre').limit(500);
        const titles = existing.map(t => t.titre);

        console.log(`📦 Traitement d'une vague de ${items.length} items...`);
        const analysis = await getAnalysis(items, titles);

        for (const res of analysis.results) {
            if (res.action === 'migrate' || res.action === 'merge') {
                const difficultyMap = { 'Facile': 1, 'Moyen': 2, 'Difficile': 3 };
                const insertData = {
                    ...res.final_data,
                    notoriete: res.final_data.noting_score,
                    niveau_difficulte: difficultyMap[res.final_data.niveau_difficulte] || 1,
                    pays: [res.final_data.pays],
                    langue: 'fr',
                    ecart_temps_max: 500, ecart_temps_min: 20, facteur_variation: 1,
                    migration_at: new Date().toISOString(),
                    source_goju2_id: res.source_id,
                    frequency_score: 0
                };
                delete insertData.noting_score;

                const { error } = await supabase.from('evenements').insert([insertData]);
                if (!error) {
                    totalMigrated++;
                    console.log(`  ✅ ${insertData.titre} (${insertData.date_formatee})`);
                } else {
                    console.error(`  ❌ Error ${res.final_data.titre}:`, error.message);
                }
            }

            // Mark as transferred
            const ids = [res.source_id, ...(res.merged_ids || [])];
            await supabase.from('goju2').update({ transferred: true, transferred_at: new Date().toISOString() }).in('id', ids);
        }
    }
    console.log(`\n✨ Migration Terminée ! Total migré : ${totalMigrated}`);
}

runFullMigration();
