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

async function superDeepAudit() {
    console.log("🕵️ ANALYSE SUPRA-PROFONDE (Expert Mode)...");

    // 1. Charger toute la base
    let from = 0;
    let allEvents = [];
    while (true) {
        const { data, error } = await supabase.from('evenements').select('id, titre, date, notoriete_fr').range(from, from + 999);
        if (error || !data) break;
        allEvents = allEvents.concat(data);
        if (data.length < 1000) break;
        from += 1000;
    }
    console.log(`📊 ${allEvents.length} événements en base.`);

    // 2. Vérification BC (Sécurité absolue)
    const bcEvents = allEvents.filter(e => {
        const year = parseInt(e.date.split('-')[0]);
        return year < 1; // Année <= 0
    });

    if (bcEvents.length > 0) {
        console.log(`❌ Erreur critique : ${bcEvents.length} événements trouvés AVANT J.C.`);
    }

    // 3. Pré-filtrage Intelligent (on regroupe par année pour trouver les doublons sémantiques potentiels)
    console.log("🔍 Recherche de suspects sémantiques...");
    const suspects = [];
    const groupedByYear = {};

    allEvents.forEach(e => {
        const year = parseInt(e.date.split('-')[0]);
        if (!groupedByYear[year]) groupedByYear[year] = [];
        groupedByYear[year].push(e);
    });

    const years = Object.keys(groupedByYear).map(Number).sort((a, b) => a - b);

    for (const year of years) {
        const events = groupedByYear[year];
        if (events.length < 2) continue;

        for (let i = 0; i < events.length; i++) {
            for (let j = i + 1; j < events.length; j++) {
                const e1 = events[i];
                const e2 = events[j];

                const t1 = e1.titre.toLowerCase();
                const t2 = e2.titre.toLowerCase();

                // On suspecte si :
                // - Mots clés identiques après suppression des préfixes communs
                const clean = (t) => t.replace(/^(création de l'|lancement de l'|début de la |fondation de l'|le |la |les |un |une )+/g, '').trim();
                const c1 = clean(t1);
                const c2 = clean(t2);

                if (c1 === c2 || c1.includes(c2) || c2.includes(c1)) {
                    suspects.push({ e1, e2, reason: "Titre quasi-identique (même année)" });
                }
            }
        }
    }

    // Fenêtre +/- 10 ans pour les événements liés
    for (let i = 0; i < allEvents.length; i++) {
        const e1 = allEvents[i];
        const y1 = parseInt(e1.date.split('-')[0]);

        for (let j = i + 1; j < allEvents.length; j++) {
            const e2 = allEvents[j];
            const y2 = parseInt(e2.date.split('-')[0]);

            if (y2 - y1 > 10) break; // Fenêtre max 10 ans

            // Test de similarité de titre très fort pour les années différentes
            if (e1.titre.toLowerCase() === e2.titre.toLowerCase()) {
                suspects.push({ e1, e2, reason: "Même titre exact (années différentes)" });
            }
        }
    }

    console.log(`🧐 ${suspects.length} paires suspectes à expertiser.`);

    // 4. Expertise IA (Batch 50)
    const report = { bc: bcEvents, duplicates: [], distinct: [] };
    const batchSize = 50;

    for (let i = 0; i < suspects.length; i += batchSize) {
        const batch = suspects.slice(i, i + batchSize);
        console.log(`🤖 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(suspects.length / batchSize)}...`);

        const prompt = `HISTORIEN EXPERT : Voici des paires d'événements suspectés d'être des DOUBLONS (B1 à B${batch.length}).
DECIDE :
- "duplicate" : Si c'est EXACTEMENT le même fait historique.
- "distinct" : Si ce sont deux faits différents (ex: deux prix Nobel différents, deux batailles).

LISTE :
${batch.map((p, idx) => `B${idx + 1}: [${p.e1.date}] ${p.e1.titre} VS [${p.e2.date}] ${p.e2.titre}`).join('\n')}

Réponds UNIQUEMENT en JSON :
{
  "results": [
    { "index": 1, "verdict": "duplicate|distinct", "keep": "ID_TO_KEEP" }
  ]
}`;

        try {
            const res = await model.generateContent(prompt);
            const data = JSON.parse(res.response.text());
            data.results.forEach(r => {
                const s = batch[r.index - 1];
                if (r.verdict === 'duplicate') {
                    // On garde celui qui est le plus complet ou a la meilleure notoriété
                    const toKeep = r.keep === s.e1.id ? s.e1 : s.e2;
                    const toDelete = r.keep === s.e1.id ? s.e2 : s.e1;
                    report.duplicates.push({ keep: toKeep, delete: toDelete });
                } else {
                    report.distinct.push({ e1: s.e1, e2: s.e2 });
                }
            });
        } catch (err) {
            console.error("❌ Erreur batch:", err.message);
        }
    }

    fs.writeFileSync('deep_audit_final.json', JSON.stringify(report, null, 2));
    console.log("\n✅ Analyse terminée. Fichier deep_audit_final.json généré.");
    console.log(`- BC : ${report.bc.length}`);
    console.log(`- Doublons confirmés : ${report.duplicates.length}`);
}

superDeepAudit();
