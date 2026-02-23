
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const FRIDAY_EVENING = '2026-01-30T18:00:00.000Z';

async function fixTitles() {
    console.log("🚀 Starting title repair mission...");

    const { data, error } = await supabase
        .from('evenements')
        .select('id, titre')
        .gte('created_at', FRIDAY_EVENING);

    if (error) {
        console.error("Error fetching events:", error.message);
        return;
    }

    const tooLong = data.filter(e => e.titre && e.titre.length > 55);
    console.log(`Found ${tooLong.length} titles to shorten.`);

    // Process in batches of 10 for efficiency and stability
    const batchSize = 10;
    for (let i = 0; i < tooLong.length; i += batchSize) {
        const batch = tooLong.slice(i, i + batchSize);
        console.log(`\n📦 Processing batch ${i / batchSize + 1}/${Math.ceil(tooLong.length / batchSize)}...`);

        const prompt = `
        Tu es un expert en titres historiques pour un jeu de chronologie.
        Ta mission : Raccourcir les titres suivants pour qu'ils fassent MOINS de 50 caractères.
        Garde l'essentiel (Sujet + Action). Enlève toutes les explications après la virgule.
        
        Exemple : "L'Assassinat d'Henri IV par Ravaillac dans la rue de la Ferronnerie" -> "L'Assassinat d'Henri IV"
        
        LISTE À COURCIR :
        ${JSON.stringify(batch.map(e => ({ id: e.id, current: e.titre })))}
        
        RETOURNE UNIQUEMENT UN JSON :
        {
          "replacements": [
            { "id": "...", "short": "..." }
          ]
        }
        `;

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const { replacements } = JSON.parse(responseText);

            for (const item of replacements) {
                console.log(`   ✨ ${item.short} (${item.short.length} chars)`);
                const { error: updateError } = await supabase
                    .from('evenements')
                    .update({ titre: item.short })
                    .eq('id', item.id);

                if (updateError) {
                    console.error(`      ❌ Error updating ${item.id}:`, updateError.message);
                }
            }
        } catch (e) {
            console.error(`   ❌ Failed to process batch:`, e.message);
        }
    }

    console.log("\n✅ Mission complete ! All titles should be short now.");
}

fixTitles();
