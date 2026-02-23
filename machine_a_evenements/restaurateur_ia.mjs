import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function restoreAncient() {
    console.log("🏛️ [RESTAURATEUR PHASE 2] Restauration intelligente des événements anciens...");

    const suspects = [
        "L'Héritage de", "Héritage de", "L'ère ", "L'Ère ", "Hommage à",
        "Vision et", "Un talent", "Un Règne", "Un Empire", "Un Roi",
        "Légende et", "Un Phare d'Espoir"
    ];

    let allMatches = [];
    for (const s of suspects) {
        const { data } = await supabase.from('evenements').select('*').ilike('titre', `%${s}%`);
        if (data) allMatches = allMatches.concat(data);
    }

    const uniqueMatches = Array.from(new Map(allMatches.map(item => [item.id, item])).values());
    console.log(`🔍 ${uniqueMatches.length} événements à traiter intelligemment.`);

    for (const event of uniqueMatches) {
        console.log(`\n🧠 Analyse de : "${event.titre}"...`);

        const prompt = `
Tu es un expert historien. On a fait une erreur et transformé un titre d'événement HISTORIQUE PRÉCIS en un titre VAGUE.
Tu dois retrouver le titre d'origine qui correspond à l'événement de MORT, DÉCÈS ou ASSASSINAT décrit.

TITRE VAGUE ACTUEL : "${event.titre}"
DESCRIPTION : "${event.description_detaillee}"
DATE : ${event.date}

MISSION : Redonne-moi le titre historique précis (ex: "Mort de Clovis Ier", "Assassinat de Henri IV"). 
Le titre doit être COURT et FACTUEL. Il doit permettre de situer précisément l'événement à la date donnée.

Réponds UNIQUEMENT en JSON :
{
  "titre_restaure": "string",
  "description_restauree": "string"
}
(La description doit être celle d'origine ou une version précise de l'événement de mort/assassinat, sans être morbide mais sans être vague).
`;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            const restored = JSON.parse(text);

            console.log(`   🔸 Titre restauré : ${restored.titre_restaure}`);

            await supabase
                .from('evenements')
                .update({
                    titre: restored.titre_restaure,
                    description_detaillee: restored.description_restauree,
                    donnee_corrigee: false
                })
                .eq('id', event.id);

            console.log(`   ✅ Restauration réussie.`);

        } catch (e) {
            console.error(`   ❌ Échec pour "${event.titre}":`, e.message);
        }
    }
}

restoreAncient();
