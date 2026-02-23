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

async function finalFrenchCleanup() {
    console.log("🇫🇷 [CHIRURGIEN V3] Nettoyage final et traduction en français...");

    const { data: candidates, error } = await supabase
        .from('evenements')
        .select('id, titre, description_detaillee, date_formatee');

    if (error) return;

    // On cible tout ce qui n'est pas en français ou qui a l'air bizarre
    const suspects = candidates.filter(c => {
        const t = c.titre;
        return (
            t.includes("aucun") || t.includes("Aucun") ||
            t.includes("matching") || t.includes("matching") ||
            t.includes("No historical") ||
            t.includes("pattern") ||
            t.includes("Birth of") || t.includes("Death of") || t.includes("Launch of") || // Anglais
            (t.includes("Décès de l'Empire")) ||
            (t.includes("Mort de la ")) ||
            t.length > 70
        );
    });

    console.log(`🔍 ${suspects.length} titres à corriger impérativement.`);

    for (const event of suspects) {
        const prompt = `Tu es un éditeur historique expert pour un jeu de chronologie. 
Redonne-moi le titre HISTORIQUE EXACT en FRANÇAIS pour cet événement.

DESCRIPTION: "${event.description_detaillee}"
ANNEE: ${event.date_formatee}
TITRE ACTUEL ERRONE: "${event.titre}"

CONSIGNES :
- Titre court et prestigieux (ex: "Le Jeudi noir", "Signature du traité de Versailles").
- Si c'est un décès de personne : "Mort de [Nom]".
- Si c'est la fin d'un Empire : "Chute de l'Empire [Nom]".
- JAMAIS de commentaires techniques comme "Aucun titre ne convient".
- RÉPONSE UNIQUEMENT LE TITRE EN FRANÇAIS.`;

        try {
            const result = await model.generateContent(prompt);
            const corrected = result.response.text().trim().replace(/^"|"$/g, '');
            console.log(`   🔸 "${event.titre}" -> "${corrected}"`);
            await supabase.from('evenements').update({ titre: corrected }).eq('id', event.id);
        } catch (e) {
            console.error(e.message);
        }
    }
}
finalFrenchCleanup();
