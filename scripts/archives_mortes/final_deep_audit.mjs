import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabase } from './machine_a_evenements/AGENTS/shared_utils.mjs';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const supabase = getSupabase('prod');

async function finalDeepAudit() {
    console.log("🧐 ANALYSE FINALE ET PROFONDE DES SUSPECTS...");

    // 1. Charger les suspects identifiés précédemment
    if (!fs.existsSync('semantic_duplicates_report.json')) {
        console.error("❌ Fichier semantic_duplicates_report.json introuvable.");
        return;
    }
    const suspects = JSON.parse(fs.readFileSync('semantic_duplicates_report.json', 'utf8'));
    console.log(`📊 ${suspects.length} paires suspectes initiales.`);

    // 2. Vérifier lesquels existent encore en base
    const { data: allCurrent } = await supabase.from('evenements').select('id, titre, date');
    const existingIds = new Set(allCurrent.map(e => e.id));

    const remainingSuspects = suspects.filter(s => existingIds.has(s.id1) && existingIds.has(s.id2));
    console.log(`🔍 ${remainingSuspects.length} paires suspectes encore en base.`);

    // 3. Expertise IA "Double-Check" ultra-profonde
    const results = [];
    const batchSize = 30;

    for (let i = 0; i < remainingSuspects.length; i += batchSize) {
        const batch = remainingSuspects.slice(i, i + batchSize);
        console.log(`🤖 Expertise Profonde Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(remainingSuspects.length / batchSize)}...`);

        const prompt = `Tu es un historien critique. Analyse ces paires (B1-B${batch.length}) pour détecter des doublons sémantiques.
IMPORTANT : Ne marque "duplicate" que si c'est EXACTEMENT le même événement (ex: SMIG vs Salaire Minimum).
Si ce sont des événements différents se passant la même année (ex: deux prix Nobel, deux décès), marque "distinct".
Si c'est un lien causal (ex: Mort de X menant au Sacre de Y), marque "related_distinct" (à garder).

LISTE :
${batch.map((s, idx) => `B${idx + 1}: [${s.date1}] ${s.titre1} VS [${s.date2}] ${s.titre2}`).join('\n')}

Réponds en JSON :
{
  "audit": [
    { "index": 1, "verdict": "duplicate|distinct|related_distinct", "explanation": "Précise ton expertise", "id_to_keep": "ID1 ou ID2" }
  ]
}`;

        try {
            const res = await model.generateContent(prompt);
            const data = JSON.parse(res.response.text());
            data.audit.forEach(r => {
                const s = batch[r.index - 1];
                results.push({
                    ...r,
                    e1: { id: s.id1, titre: s.titre1, date: s.date1 },
                    e2: { id: s.id2, titre: s.titre2, date: s.date2 }
                });
            });
        } catch (err) {
            console.error("❌ Erreur batch:", err.message);
        }
    }

    // 4. Rapport Final
    const finalReport = {
        duplicates: results.filter(r => r.verdict === 'duplicate'),
        false_positives: results.filter(r => r.verdict !== 'duplicate'),
        bc_warning: allCurrent.filter(e => parseInt(e.date.split('-')[0]) < 1)
    };

    fs.writeFileSync('DEEP_ANALYST_REPORT.json', JSON.stringify(finalReport, null, 2));
    console.log(`\n🏁 RAPPORT GÉNÉRÉ : DEEP_ANALYST_REPORT.json`);
    console.log(`- Doublons RÉELS confirmés : ${finalReport.duplicates.length}`);
    console.log(`- Faux positifs (distincts) : ${finalReport.false_positives.length}`);
    console.log(`- Erreurs BC (Avant J.C.) : ${finalReport.bc_warning.length}`);
}

finalDeepAudit();
