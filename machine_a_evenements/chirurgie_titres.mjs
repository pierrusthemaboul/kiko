import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function fixHallucinations() {
    console.log("🩹 [CHIRURGIEN] Nettoyage des erreurs de titres historiques...");

    // 1. Détecter les titres absurdes ou suspects
    // On cherche les titres générés par erreur ('Aucun...', 'matching...', etc.)
    // Et les "Mort de..." qui semblent être des événements (Guerre, Krach, etc.)
    const { data: candidates, error } = await supabase
        .from('evenements')
        .select('id, titre, description_detaillee, date_formatee');

    if (error) {
        console.error("❌ Erreur lecture:", error.message);
        return;
    }

    const suspects = candidates.filter(c =>
        c.titre.includes("Aucun") ||
        c.titre.includes("matching") ||
        c.titre.includes("convient") ||
        c.titre.includes("correspond") ||
        (c.titre.startsWith("Mort de") && (c.titre.includes("Guerre") || c.titre.includes("Jeudi noir") || c.titre.includes("Empire") || c.titre.includes("Plan")))
    );

    console.log(`🔍 ${suspects.length} titres suspects identifiés.`);

    for (const event of suspects) {
        console.log(`\n🧐 Analyse de : "${event.titre}"`);

        const prompt = `You are a strict Historical Editor. 
I have corrupted some historical event titles. You must find the GENUINE historical title based on the description.

CORRUPTED TITLE: "${event.titre}"
DESCRIPTION: "${event.description_detaillee}"
YEAR: ${event.date_formatee}

RULES:
- If the description describes an event (Krach, War, Treaty, Fondation), use the name of that event as title (e.g., "Le Jeudi noir", "Fin de la Première Guerre mondiale").
- If it's a person's death, use "Mort de [Personne]".
- NO NOT include meta-comments like "Aucun titre ne convient".
- RETURN ONLY THE CORRECT TITLE.`;

        try {
            const result = await model.generateContent(prompt);
            const correctedTitre = result.response.text().trim().replace(/^"|"$/g, '');

            console.log(`   ✅ Correction : "${correctedTitre}"`);

            await supabase
                .from('evenements')
                .update({
                    titre: correctedTitre,
                    donnee_corrigee: true // Marquer pour vérification finale
                })
                .eq('id', event.id);

        } catch (e) {
            console.error(`   ❌ Échec pour ${event.id}:`, e.message);
        }
    }

    console.log("\n✨ Chirurgie terminée. Les titres absurdes ont été remplacés par la vérité historique extraite des descriptions.");
}

fixHallucinations();
