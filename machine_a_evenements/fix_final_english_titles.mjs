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

const TITLES_TO_FIX = [
    "f134f6f3-b5e4-4585-928b-8088f2ff13b9", // Marriage of Berthe of Burgundy and Robert II
    "0c4eb946-a8b5-43c4-91ab-a7d0f64a8076", // Bill of Rights
    "55249e5e-a58a-405d-981a-7f53c7abe3d0", // Death of Jeanne d'Évreux
    "e8306771-e0e7-4dd9-9c35-2ff0fc9fd1ce", // Coronation of Isabeau of Bavaria
    "6762e56e-e1a5-4982-9245-b9b79ae18628", // Kansei Unzen Eruption and Tsunami
    "36366c1b-2efe-4930-bbbe-f116050f86bf", // Austro-Hungarian Annexation of Bosnia and Herzegovina
    "26e868bb-d39a-488e-81aa-cd429583b3cb", // Completion of the Renovation of the Lyon Courthouse
    "852f9493-20d3-4b05-a581-d8fe0b06cca6"  // Introduction of Sound in Cinema (titre détecté à la main)
];

async function fixTitles() {
    console.log(`🚀 Traduction de ${TITLES_TO_FIX.length} titres anglais...`);

    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, date')
        .in('id', TITLES_TO_FIX);

    if (error) {
        console.error("❌ Erreur Supabase:", error.message);
        return;
    }

    const prompt = `Tu es un expert en histoire. Traduis ces titres d'événements anglais en FRANÇAIS élégant et historiquement correct.
    
    ÉVÉNEMENTS :
    ${JSON.stringify(events.map(e => ({ id: e.id, original: e.titre, year: new Date(e.date).getFullYear() })), null, 2)}
    
    MISSION :
    Pour chaque événement, donne la traduction en français.
    ATTENTION : Pour "Bill of Rights", utilise le terme historique reconnu en France.
    
    RÉPONDS UNIQUEMENT EN JSON :
    {
      "translations": [
        { "id": "uuid", "fr": "Titre en français" }
      ]
    }`;

    try {
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text());

        for (const item of data.translations) {
            process.stdout.write(`⏳ Mise à jour: ${item.fr}... `);
            const { error: updError } = await supabase
                .from('evenements')
                .update({ titre: item.fr })
                .eq('id', item.id);

            if (updError) {
                console.log(`❌ (${updError.message})`);
            } else {
                console.log(`✅`);
            }
        }
    } catch (e) {
        console.error("❌ Erreur pendant la traduction:", e.message);
    }

    console.log("\n🏁 Tous les titres sont désormais en français.");
}

fixTitles();
