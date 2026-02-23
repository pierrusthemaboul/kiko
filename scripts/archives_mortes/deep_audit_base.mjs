import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabase } from './machine_a_evenements/AGENTS/shared_utils.mjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

const supabase = getSupabase('prod');

async function deepAudit() {
    console.log("🚀 Lancement de l'ANALYSE PROFONDE de la base...");

    // 1. Charger toute la base
    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from('evenements').select('id, titre, date, notoriete_fr').range(from, from + 999);
        if (error) break;
        allEvents = allEvents.concat(data);
        if (data.length < 1000) break;
        from += 1000;
    }
    console.log(`📊 ${allEvents.length} événements chargés.`);

    // 2. Détection BC (Avant J.C.)
    const bcEvents = allEvents.filter(e => new Date(e.date).getFullYear() < 1);
    if (bcEvents.length > 0) {
        console.log(`⚠️ ${bcEvents.length} événements AVANT J.C. identifiés comme erreurs !`);
        fs.writeFileSync('bc_events_to_delete.json', JSON.stringify(bcEvents, null, 2));
    }

    // 3. Analyse Sémantique Profonde (Blocs de 30 ans pour plus de contexte)
    allEvents.sort((a, b) => new Date(a.date).getFullYear() - new Date(b.date).getFullYear());

    const suspects = [];
    const processedPairs = new Set();

    // On parcourt par fenêtres glissantes
    for (let i = 0; i < allEvents.length; i++) {
        const current = allEvents[i];
        const currentYear = new Date(current.date).getFullYear();

        // On cherche des candidats dans +/- 20 ans
        const candidates = allEvents.filter((e, idx) => {
            if (idx <= i) return false;
            const y = new Date(e.date).getFullYear();
            return y >= currentYear && y <= currentYear + 20;
        });

        // Simplicité : Si les titres sont trop proches (Levenshtein simple ou fuzzy match)
        for (const candidate of candidates) {
            const pairKey = [current.id, candidate.id].sort().join('_');
            if (processedPairs.has(pairKey)) continue;

            const t1 = current.titre.toLowerCase();
            const t2 = candidate.titre.toLowerCase();

            // Critères de suspicion
            const startsSame = t1.substring(0, 10) === t2.substring(0, 10);
            const containsEachOther = t1.includes(t2) || t2.includes(t1);

            if (startsSame || containsEachOther) {
                suspects.push({
                    e1: current,
                    e2: candidate,
                    reason: startsSame ? "Début de titre identique" : "Titre imbriqué"
                });
                processedPairs.add(pairKey);
            }
        }
    }

    console.log(`🧐 ${suspects.length} paires suspectes isolées par filtrage rapide.`);

    // 4. Passage expert sur les suspects restants
    const finalReport = [];
    const batchSize = 15;

    for (let i = 0; i < suspects.length; i += batchSize) {
        const batch = suspects.slice(i, i + batchSize);
        console.log(`🤖 Expertise IA Batch ${i / batchSize + 1}/${Math.ceil(suspects.length / batchSize)}...`);

        const prompt = `En tant qu'historien expert, analyse ces paires d'événements (B-1 à B-${batch.length}).
Détermine si ce sont des DOUBLONS (même événement réel déguisé) ou des ÉVÉNEMENTS DISTINCTS.

CONSIGNES :
- "duplicate": C'est le même fait historique (ex: SMIG vs Salaire Minimum, ou Sacre vs Couronnement le même jour).
- "distinct": Ce sont deux faits différents (ex: Deux batailles différentes, deux livres différents).
- "related": Événements liés mais pas identiques (ex: Début de guerre vs Fin de guerre, ou Mariage vs Sacre). Marque les comme "distinct" pour conservation.

LISTE :
${batch.map((s, idx) => `Paire B-${idx + 1}:
1: ${s.e1.titre} [${new Date(s.e1.date).getFullYear()}]
2: ${s.e2.titre} [${new Date(s.e2.date).getFullYear()}]`).join('\n\n')}

Réponds en JSON :
{
  "results": [
    { "pair_index": 1, "verdict": "duplicate|distinct", "explanation": "Pourquoi ?", "id_to_keep": "ID_SI_DUPLICATE_OU_NULL" }
  ]
}
Note: id_to_keep doit être le titre le plus complet/propre.`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());

            data.results.forEach(res => {
                const s = batch[res.pair_index - 1];
                finalReport.push({
                    ...res,
                    e1: s.e1,
                    e2: s.e2
                });
            });
        } catch (err) {
            console.error("❌ Erreur expertise:", err.message);
        }
    }

    fs.writeFileSync('deep_audit_report.json', JSON.stringify({
        bc_events: bcEvents,
        duplicates: finalReport.filter(r => r.verdict === 'duplicate'),
        distinct: finalReport.filter(r => r.verdict === 'distinct')
    }, null, 2));

    console.log(`\n🏁 ANALYSE TERMINÉE.`);
    console.log(`- Événements BC : ${bcEvents.length}`);
    console.log(`- Doublons confirmés : ${finalReport.filter(r => r.verdict === 'duplicate').length}`);
    console.log(`- Événements distincts confirmés : ${finalReport.filter(r => r.verdict === 'distinct').length}`);
    console.log("Rapport complet dans : deep_audit_report.json");
}

deepAudit();
