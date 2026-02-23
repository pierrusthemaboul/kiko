
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';

const agentName = "QUALITY_GATE";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function main() {
    // Read SENTINEL output (events that passed duplicate check)
    const sentinelPath = path.join(process.cwd(), '../SENTINEL/STORAGE/OUTPUT/sentinel_filtered_ids.json');

    if (!fs.existsSync(sentinelPath)) {
        console.error(`[${agentName}] Erreur: sentinel_filtered_ids.json absent.`);
        process.exit(1);
    }

    const events = JSON.parse(fs.readFileSync(sentinelPath, 'utf8'));

    if (events.length === 0) {
        console.log(`[${agentName}] Aucun événement à évaluer.`);
        const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/quality_gate_passed.json');
        fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
        return;
    }

    console.log(`[${agentName}] Évaluation qualité de ${events.length} événements...`);

    // Batch events for AI evaluation (max 25 per call to avoid token limits)
    const BATCH_SIZE = 25;
    const allPassed = [];
    const allRejected = [];

    for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        console.log(`[${agentName}] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} événements...`);

        const prompt = `
Tu es QUALITY_GATE, le contrôleur qualité du jeu Kiko.
Kiko est un jeu de chronologie pour le GRAND PUBLIC FRANÇAIS.

Ta mission : évaluer si chaque événement est ASSEZ CONNU pour être dans le jeu.

🎯 CRITÈRE UNIQUE : Un Français moyen (30-50 ans, bac ou plus) doit avoir DÉJÀ ENTENDU PARLER de cet événement.

ÉVÉNEMENTS À ÉVALUER :
${JSON.stringify(batch.map(e => ({ titre: e.titre, year: e.year })), null, 2)}

Pour chaque événement, réponds :
- "pass": true si un Français moyen connaît cet événement (même vaguement)
- "pass": false si c'est trop spécialisé/obscur
- "notoriete": ton estimation 0-100 de la notoriété pour un Français moyen
- "reason": explication courte (10 mots max)

BARÈME NOTORIÉTÉ :
- 90-100 : Icône mondiale (Chute du mur de Berlin, 1er pas sur la Lune)
- 75-89 : Culture générale forte (Appel du 18 juin, Mai 68)
- 50-74 : Scolaire / médiatisé (Édit de Nantes, Bataille de Marignan)
- 30-49 : Connu des cultivés uniquement (Traité de Westphalie)
- 0-29 : Expert uniquement (Pragmatique Sanction de Bourges)

SEUIL : Rejette tout ce qui est en dessous de 30.
EXCEPTION : Pour les périodes anciennes (Antiquité et Moyen Âge, avant 1500), le seuil est de 25.
L'Antiquité est naturellement moins connue du grand public : accepte les événements qui marquent des tournants (Sacs de Rome, grandes batailles, inventions majeures) même si le Français moyen ne connaît pas les détails. On veut des cartes, pas un vide historique !

FORMAT JSON :
{
  "evaluations": [
    { "titre": "...", "year": 1234, "pass": true, "notoriete": 65, "reason": "Enseigné au collège" },
    ...
  ]
}
`;

        try {
            const result = await model.generateContent(prompt);
            const data = JSON.parse(result.response.text());

            for (const evaluation of data.evaluations) {
                const originalEvent = batch.find(e => e.titre === evaluation.titre);
                if (!originalEvent) continue;

                const threshold = originalEvent.year < 1500 ? 25 : 30;

                if (evaluation.pass && evaluation.notoriete >= threshold) {
                    allPassed.push({
                        ...originalEvent,
                        quality_notoriete: evaluation.notoriete,
                        quality_reason: evaluation.reason
                    });
                    console.log(`   ✅ "${evaluation.titre}" (${evaluation.notoriete}) - ${evaluation.reason}`);
                } else {
                    allRejected.push({
                        titre: evaluation.titre,
                        year: evaluation.year,
                        notoriete: evaluation.notoriete,
                        reason: evaluation.reason
                    });
                    console.log(`   ❌ "${evaluation.titre}" (${evaluation.notoriete}) - ${evaluation.reason}`);
                }
            }

            // Rate limit pause
            if (i + BATCH_SIZE < events.length) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

        } catch (e) {
            console.error(`[${agentName}] Erreur batch:`, e.message);
            // On error, pass all events in batch through (fail-open)
            allPassed.push(...batch);
        }
    }

    // Save results
    const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/quality_gate_passed.json');
    fs.writeFileSync(outputPath, JSON.stringify(allPassed, null, 2));

    const rejectPath = path.join(process.cwd(), 'STORAGE/OUTPUT/quality_gate_rejected.json');
    fs.writeFileSync(rejectPath, JSON.stringify(allRejected, null, 2));

    console.log(`\n[${agentName}] === RÉSULTAT ===`);
    console.log(`   ✅ Passés: ${allPassed.length}/${events.length}`);
    console.log(`   ❌ Rejetés: ${allRejected.length}/${events.length}`);

    if (allRejected.length > 0) {
        console.log(`\n   Événements rejetés (trop obscurs) :`);
        allRejected.forEach(r => console.log(`      - "${r.titre}" (${r.year}) not=${r.notoriete}: ${r.reason}`));
    }

    logDecision(agentName, 'QUALITY_CHECK', { total: events.length }, 'SUCCESS',
        `${allPassed.length} passés, ${allRejected.length} rejetés`,
        { passed: allPassed.length, rejected: allRejected.length });
}

main();
