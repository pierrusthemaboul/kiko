import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration Supabase
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

// Configuration Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const ALLOWED_THEMES = [
    "Politique",
    "Guerre & Militaire",
    "Science & Technologie",
    "Arts & Culture",
    "Religion & Spiritualité",
    "Économie & Commerce",
    "Société & Social",
    "Exploration & Découvertes",
    "Catastrophes & Environnement",
    "Sport",
    "Justice & Droit",
    "Santé & Médecine"
];

async function classifyEvent(event) {
    const prompt = `Tu es un expert en histoire. Ta tâche est de classer l'événement suivant dans UNE SEULE des catégories autorisées.
Utilise le titre et la description détaillée pour choisir la catégorie la plus pertinente.

LISTE DES CATÉGORIES AUTORISÉES :
${ALLOWED_THEMES.map(t => `- ${t}`).join('\n')}

ÉVÉNEMENT :
Titre : ${event.titre}
Description : ${event.description_detaillee}

Réponds uniquement avec le nom de la catégorie choisie, rien d'autre.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let theme = response.text().trim();

        // Nettoyage au cas où l'IA ajoute du texte
        theme = theme.replace(/^- /, '').trim();

        // Validation que le thème est bien dans la liste
        if (ALLOWED_THEMES.includes(theme)) {
            return [theme];
        } else {
            console.warn(`⚠️ Catégorie inconnue retournée : "${theme}" pour "${event.titre}". Tentative de correction...`);
            // Trouver le thème le plus proche si possible
            const closest = ALLOWED_THEMES.find(t => theme.toLowerCase().includes(t.toLowerCase()));
            return closest ? [closest] : ["Société & Social"]; // Fallback par défaut
        }
    } catch (error) {
        console.error(`❌ Erreur IA pour "${event.titre}":`, error.message);
        return null;
    }
}

async function startClassification() {
    console.log("🚀 Démarrage de la classification globale des événements...");

    let allEvents = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    console.log("📡 Récupération de tous les événements...");
    while (hasMore) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, description_detaillee')
            .range(from, from + pageSize - 1)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Erreur Supabase:", error.message);
            return;
        }

        allEvents = allEvents.concat(data);
        if (data.length < pageSize) {
            hasMore = false;
        } else {
            from += pageSize;
            console.log(`- ${allEvents.length} événements récupérés...`);
        }
    }

    const events = allEvents;
    console.log(`✅ Total : ${events.length} événements à traiter.`);

    const batchSize = 10;
    let processed = 0;
    let updated = 0;

    for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        console.log(`\n📦 Traitement du batch ${Math.floor(processed / batchSize) + 1} (${processed + 1} à ${Math.min(processed + batchSize, events.length)})...`);

        const promises = batch.map(async (event) => {
            const theme = await classifyEvent(event);
            if (theme) {
                const { error: updateError } = await supabase
                    .from('evenements')
                    .update({ types_evenement: theme })
                    .eq('id', event.id);

                if (updateError) {
                    console.error(`❌ Erreur update pour "${event.titre}":`, updateError.message);
                } else {
                    return true;
                }
            }
            return false;
        });

        const results = await Promise.all(promises);
        updated += results.filter(r => r).length;
        processed += batch.length;

        console.log(`✅ Progress: ${processed}/${events.length} (${updated} mis à jour)`);

        await new Promise(resolve => setTimeout(resolve, 800));
    }

    console.log(`\n✨ Classification terminée ! ${updated} événements ont été reclassés.`);
}

startClassification();
