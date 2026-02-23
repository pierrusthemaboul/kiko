import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabase } from './AGENTS/shared_utils.mjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const supabase = getSupabase('prod');

async function fullAudit() {
    console.log("🛡️ Lancement du DIAGNOSTIC GLOBAL de fiabilité (Gemini 2.0 Flash)...");

    // Récupération de tous les événements (avec boucle pour dépasser la limite de 1000)
    let events = [];
    let from = 0;
    let step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, date')
            .order('id')
            .range(from, from + step - 1);

        if (error) {
            console.error("❌ Erreur Supabase:", error.message);
            return;
        }

        events = events.concat(data);
        if (data.length < step) hasMore = false;
        else from += step;
    }

    console.log(`📊 ${events.length} événements à analyser.`);
    const auditReport = [];
    const BATCH_SIZE = 50;
    let suspiciousCount = 0;

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        process.stdout.write(`⏳ Analyse [${i + 1} à ${Math.min(i + BATCH_SIZE, events.length)}] / ${events.length}... `);

        const prompt = `Tu es une sentinelle historique. Vérifie ces événements (Titre et Année).
L'année doit correspondre au consensus historique (marge 1 an max).
Un événement est SUSPECT si :
- La date est fausse.
- L'événement semble inventé (hallucination).
- L'événement est anachronique.

LISTE :
${JSON.stringify(batch.map(e => ({ id: e.id, titre: e.titre, annee: new Date(e.date).getFullYear() })), null, 2)}

Réponds UNIQUEMENT en JSON :
{
  "results": [
    { "id": "...", "reliable": true/false, "note": "Si false, explique pourquoi" }
  ]
}`;

        try {
            const result = await model.generateContent(prompt);
            const response = JSON.parse(result.response.text());

            for (const res of response.results) {
                if (!res.reliable) {
                    const original = batch.find(b => b.id === res.id);
                    auditReport.push({
                        ...res,
                        original_titre: original.titre,
                        original_date: original.date
                    });
                    suspiciousCount++;
                }
            }
            process.stdout.write(`✅ (${response.results.filter(r => !r.reliable).length} suspects trouvés)\n`);
        } catch (e) {
            console.error(`\n❌ Erreur sur le lot ${i}:`, e.message);
        }

        // Petite pause pour le quota
        await new Promise(r => setTimeout(r, 500));
    }

    // Sauvegarde du rapport
    const reportPath = path.join(__dirname, 'diagnostic_suspicious_events.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2));

    console.log("\n" + "=".repeat(40));
    console.log(`🏁 DIAGNOSTIC TERMINÉ`);
    console.log(`📦 Suspects détectés : ${suspiciousCount}`);
    console.log(`💾 Rapport détaillé : machine_a_evenements/diagnostic_suspicious_events.json`);
    console.log("=".repeat(40));
}

fullAudit();
