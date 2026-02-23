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

const PROMPT_KEYWORDS = [
    'stone walls', 'cinematic', 'photography', 'atmosphere', 'lighting',
    'Inside a', 'Beneath a', 'Within a', 'Heavy draperies', 'Rough wool',
    'oil painting', 'hyper-detailed', 'chiaroscuro', 'depth of field'
];

async function repairDescription(event) {
    const prompt = `Tu es un historien expert.
L'événement suivant a une description qui ressemble à un prompt technique d'IA (en anglais) au lieu d'une description historique pour un utilisateur français.

ÉVÉNEMENT : ${event.titre} (${new Date(event.date).getFullYear()})
DESCRIPTION ACTUELLE : "${event.description_detaillee}"

MISSION :
Génère une NOUVELLE description en FRANÇAIS, courte et passionnante (2 à 3 phrases, environ 200-300 caractères), expliquant l'importance historique réelle de cet événement.

RÉPONDS UNIQUEMENT EN JSON :
{
  "new_description": "La description en français ici..."
}`;

    try {
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text());
        return data.new_description;
    } catch (e) {
        console.error(`❌ Erreur pour ${event.titre}:`, e.message);
        return null;
    }
}

async function run() {
    console.log("🛠️  Lancement de la réparation globale des descriptions...");

    let offset = 0;
    const LIMIT = 100;
    let hasMore = true;
    let totalFixed = 0;

    while (hasMore) {
        process.stdout.write(`\n--- Analyse lot ${offset} à ${offset + LIMIT} ---\n`);
        const { data: events, error } = await supabase
            .from('evenements')
            .select('id, titre, date, description_detaillee')
            .not('description_detaillee', 'is', null)
            .order('id')
            .range(offset, offset + LIMIT - 1);

        if (error) {
            console.error("❌ Erreur Supabase:", error.message);
            break;
        }

        if (!events || events.length === 0) {
            hasMore = false;
            break;
        }

        const toFix = events.filter(e => {
            if (!e.description_detaillee || e.description_detaillee.trim().length < 15) return true;
            const desc = e.description_detaillee.toLowerCase();

            // Détection des préfixes génériques
            const genericPrefixes = ['événement historique important', 'evenement historique important', 'c\'est un événement'];
            const isGeneric = genericPrefixes.some(prefix => desc.startsWith(prefix));

            return isGeneric ||
                PROMPT_KEYWORDS.some(kw => desc.includes(kw.toLowerCase())) ||
                (e.description_detaillee.length > 50 && !/[éàèêëîïôûùç]/.test(desc));
        });

        if (toFix.length > 0) {
            console.log(`🔍 ${toFix.length} descriptions à réparer dans ce lot.`);
            for (const event of toFix) {
                process.stdout.write(`⏳ "${event.titre.substring(0, 30)}..." `);
                const newDesc = await repairDescription(event);

                if (newDesc) {
                    const { error: updateError } = await supabase
                        .from('evenements')
                        .update({
                            description_detaillee: newDesc,
                            donnee_corrigee: true
                        })
                        .eq('id', event.id);

                    if (!updateError) {
                        process.stdout.write(`✅\n`);
                        totalFixed++;
                    } else {
                        process.stdout.write(`❌\n`);
                    }
                }
                await new Promise(r => setTimeout(r, 200));
            }
        } else {
            console.log("✅ Rien à réparer dans ce lot.");
        }

        offset += LIMIT;
        if (events.length < LIMIT) hasMore = false;
    }

    console.log(`\n🏁 Réparation terminée ! ${totalFixed} descriptions ont été restaurées en français.`);
}

run();
