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

async function fixHallucinationsDeep() {
    console.log("🩹 [CHIRURGIEN V2] Nettoyage approfondi...");

    const { data: candidates, error } = await supabase
        .from('evenements')
        .select('id, titre, description_detaillee, date_formatee');

    if (error) return;

    // Critères de suspicion élargis
    const suspects = candidates.filter(c => {
        const t = c.titre.toLowerCase();
        return (
            t.includes("aucun") ||
            t.includes("matching") ||
            t.includes("convient") ||
            t.includes("correspond") ||
            t.includes("pertinent") ||
            t.includes("description") ||
            t.length > 80 || // Titres trop longs (souvent des commentaires)
            (t.includes("mort ") && (t.includes("guerre") || t.includes("jeudi") || t.includes("empire") || t.includes("plan") || t.includes("loi") || t.includes("création") || t.includes("fondation")))
        );
    });

    console.log(`🔍 ${suspects.length} titres suspects identifiés.`);

    for (const event of suspects) {
        console.log(`\n🧐 Analyse de : "${event.titre}"`);

        const prompt = `Based on this description and year, provide the MOST ACCURATE and CONCISE historical title.
Description: "${event.description_detaillee}"
Year: ${event.date_formatee}
Current (potentially wrong) title: "${event.titre}"

Output ONLY the title string. No quotes, no comments.`;

        try {
            const result = await model.generateContent(prompt);
            const corrected = result.response.text().trim().replace(/^"|"$/g, '');
            console.log(`   ✅ Correction : "${corrected}"`);
            await supabase.from('evenements').update({ titre: corrected }).eq('id', event.id);
        } catch (e) {
            console.error(e.message);
        }
    }
}
fixHallucinationsDeep();
