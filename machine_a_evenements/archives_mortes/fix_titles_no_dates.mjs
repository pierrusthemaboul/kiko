
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
    console.log("🔍 Recherche des titres à requalifier (sans dates)...");

    // Fetch everything updated very recently or containing years in parentheses
    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from('evenements').select('id, titre, date').range(from, from + 999);
        if (error || !data || data.length === 0) break;
        allEvents = allEvents.concat(data);
        from += 1000;
        if (data.length < 1000) break;
    }

    // Identify titles with years in parentheses like "(1422)" or "(476)"
    const yearRegex = /\(\d{1,4}\)/;
    const candidates = allEvents.filter(ev => yearRegex.test(ev.titre));

    console.log(`🎯 Trouvé ${candidates.length} titres avec dates à convertir.`);

    if (candidates.length === 0) {
        console.log("Aucun titre avec date trouvé.");
        return;
    }

    const batchSize = 15;
    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        console.log(`\n📦 Traitement du lot ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)}...`);

        const prompt = `
        Tu es un historien expert. Ta mission est de requalifier des titres historiques pour un jeu de chronologie.
        
        CRITÈRE CRITIQUE : Il est INTERDIT de mettre l'année ou une date dans le titre (car c'est un jeu où on doit deviner la date).
        
        MISSION : Remplace les années entre parenthèses par un qualificatif distinctif (protagoniste, nom de guerre, lieu précis, ou surnom).
        
        EXEMPLES :
        - "Siège de Constantinople (1422)" -> "Siège de Constantinople (Mourad II)"
        - "Bataille de Poitiers (1356)" -> "Bataille de Poitiers (Jean le Bon)" ou "Bataille de Poitiers (Guerre de Cent Ans)"
        - "Sac de Rome (1527)" -> "Sac de Rome (Charles Quint)"
        - "Bataille de la Marne (1914)" -> "Première bataille de la Marne"
        
        RÈGLES :
        1. AUCUNE DATE dans le titre final.
        2. Le titre doit rester court (< 55 caractères).
        3. Si le titre est déjà assez précis sans la date, enlève juste la parenthèse avec l'année.
        
        LISTE À TRAITER :
        ${JSON.stringify(batch.map(e => ({ id: e.id, current_titre: e.titre, date: e.date })))}
        
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

                // Final safety check: no digits for years allowed in result
                if (/\d{4}/.test(item.new_title)) {
                    console.log(`   ⚠️ Rejeté (contient encore une année) : ${item.new_title}`);
                    continue;
                }

                console.log(`   ✨ ${original.current_titre} -> ${item.new_title}`);

                const { error: updateError } = await supabase
                    .from('evenements')
                    .update({ titre: item.new_title })
                    .eq('id', item.id);

                if (updateError) {
                    console.error(`      ❌ Erreur :`, updateError.message);
                }
            }
        } catch (e) {
            console.error(`   ❌ Échec du lot:`, e.message);
        }
    }

    console.log("\n✅ Mission terminée ! Les dates ont été supprimées des titres.");
}

runFix();
