
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function runFix() {
    console.log("🔍 Recherche des titres imprécis...");

    // 1. Fetch all candidate events
    // We fetch EVERYTHING to do the filtering in JS correctly
    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from('evenements').select('id, titre, date').range(from, from + 999);
        if (error || !data || data.length === 0) break;
        allEvents = allEvents.concat(data);
        from += 1000;
        if (data.length < 1000) break;
    }

    const prefixes = ['Siège de ', 'Bataille de ', 'Traité de ', 'Prise de ', 'Sac de ', 'Paix de ', 'Chute de '];

    // Filter for very generic titles (Prefix + Place/Entity, NO parentheses)
    const candidates = allEvents.filter(ev => {
        const t = ev.titre;
        if (!t) return false;

        let isGeneric = false;
        prefixes.forEach(p => {
            if (t.startsWith(p)) {
                const rest = t.substring(p.length).trim();
                const words = rest.split(' ');
                // 1 to 3 words max for the location/subject, and no qualifiers like "par", "contre", or parentheses
                if (words.length <= 3 && !t.includes('(') && !t.includes(' pour ') && !t.includes(' par ') && !t.includes(' contre ')) {
                    isGeneric = true;
                }
            }
        });
        return isGeneric;
    });

    console.log(`🎯 Trouvé ${candidates.length} candidats à la précision.`);

    if (candidates.length === 0) {
        console.log("Aucun titre à corriger.");
        return;
    }

    // 2. Process in batches with Gemini
    const batchSize = 15;
    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        console.log(`\n📦 Traitement du lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)}...`);

        const prompt = `
        Tu es un historien expert. Ta mission est de rendre des titres historiques plus précis pour un jeu de chronologie.
        Certains titres comme "Siège de Constantinople" sont ambigus car ils se sont produits plusieurs fois.
        
        RÈGLES :
        1. Ajoute l'année entre parenthèses SI le titre est très générique (ex: "Bataille de Poitiers" -> "Bataille de Poitiers (1356)").
        2. Ou ajoute le contexte/protagoniste SI c'est plus parlant (ex: "Siège de Rome" -> "Sac de Rome (Wisigoths)").
        3. Garde le titre court (moins de 55 caractères).
        4. Si le titre actuel est "Siège de Constantinople" et que l'année est 1422, propose "Siège de Constantinople (1422)".
        
        LISTE À CORRIGER :
        ${JSON.stringify(batch.map(e => ({ id: e.id, titre: e.titre, date: e.date })))}
        
        RETOURNE UNIQUEMENT UN JSON :
        {
          "corrections": [
            { "id": "...", "new_title": "..." }
          ]
        }
        `;

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const { corrections } = JSON.parse(responseText);

            for (const item of corrections) {
                const original = batch.find(b => b.id === item.id);
                if (original && original.titre === item.new_title) {
                    console.log(`   ⏩ Ignoré : ${item.new_title} (pas de changement)`);
                    continue;
                }

                console.log(`   ✨ ${original.titre} -> ${item.new_title}`);

                const { error: updateError } = await supabase
                    .from('evenements')
                    .update({ titre: item.new_title })
                    .eq('id', item.id);

                if (updateError) {
                    console.error(`      ❌ Erreur de mise à jour pour ${item.id}:`, updateError.message);
                }
            }
        } catch (e) {
            console.error(`   ❌ Échec du traitement du lot:`, e.stack);
        }
    }

    console.log("\n✅ Correction terminée ! Tous les titres ambigus ont été précisés.");
}

runFix();
