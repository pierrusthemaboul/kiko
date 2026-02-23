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

async function translateEnglishTitles() {
    console.log("📥 Récupération de tous les événements...");
    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from('evenements').select('id, titre').range(from, from + 999);
        if (error) { console.error(error); return; }
        if (data && data.length > 0) {
            allEvents.push(...data);
            from += 1000;
        } else {
            break;
        }
    }

    console.log(`✅ ${allEvents.length} événements chargés. Recherche d'anglais par l'IA...`);

    const batchSize = 1000;
    let totalTraduits = 0;

    for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, i + batchSize);
        console.log(`\n🔍 Analyse du lot ${i} à ${i + batch.length}...`);

        const prompt = `
Voici une liste d'événements historiques (avec leur ID).
Certains titres sont accidentellement en ANGLAIS.
Trouve TOUS les titres qui sont en ANGLAIS (ex: "Creation of...", "Death of...", "Marriage of...", "Siege of...").
Traduis-les rigoureusement en FRANÇAIS, sans rajouter de date ni de point à la fin.
Ne touche absolument pas aux titres qui sont déjà en français (comme 'Bataille de...', 'Invention du...'). Ne retourne dans le JSON QUE les titres qui étaient en anglais.

ÉVÉNEMENTS:
${JSON.stringify(batch)}

FORMAT ATTENDU :
{
  "corrections": [
    {
      "id": "uuid-here",
      "ancien_titre_anglais": "Death of Marie Antoinette",
      "nouveau_titre_francais": "Exécution de Marie-Antoinette"
    }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());

            if (data.corrections && data.corrections.length > 0) {
                console.log(`⚠️ ${data.corrections.length} titres anglais trouvés dans ce lot !`);
                for (let corr of data.corrections) {
                    console.log(`   - 🇬🇧 ${corr.ancien_titre_anglais}  ==>  🇫🇷 ${corr.nouveau_titre_francais}`);
                    const { error } = await supabase.from('evenements').update({ titre: corr.nouveau_titre_francais }).eq('id', corr.id);
                    if (error) console.error(`     ❌ Erreur de mise à jour pour l'ID ${corr.id}:`, error.message);
                    else totalTraduits++;
                }
            } else {
                console.log(`✅ 0 anglais dans ce lot.`);
            }
        } catch (e) {
            console.error("❌ Erreur API Gemini :", e);
        }
    }

    console.log(`\n================================`);
    console.log(`🎉 TERMINÉ ! ${totalTraduits} titres traduits de l'anglais vers le français.`);
    console.log(`================================`);
}

translateEnglishTitles();
