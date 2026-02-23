/**
 * GENESIS INTELLIGENT - Génération d'événements guidée par l'analyse de couverture
 * Comble les trous de notoriété dans la base d'événements
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';
import { analyzeCoverage, generateGenesisContext } from './coverage_analyzer.mjs';

const agentName = "GENESIS";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function main() {
    const targetCount = parseInt(process.argv[2]) || 25;
    const maxBatchSize = parseInt(process.argv[3]) || 30; // Générer un peu plus pour compenser les rejets

    console.log(`[GENESIS INTELLIGENT] Objectif: ${targetCount} événements uniques`);
    console.log(`[GENESIS INTELLIGENT] Taille de batch: ${maxBatchSize}\n`);

    // ÉTAPE 1 : Analyser la couverture
    console.log("📊 ÉTAPE 1: Analyse de la couverture historique...");
    const coverage = await analyzeCoverage();

    console.log(`\n✅ Analyse terminée:`);
    console.log(`   - ${coverage.majorEventsPresent}/${coverage.majorEventsPresent + coverage.majorEventsMissing} événements majeurs présents`);
    console.log(`   - ${coverage.majorEventsMissing} événements majeurs manquants`);

    // ÉTAPE 2 : Générer le contexte intelligent
    console.log(`\n🧠 ÉTAPE 2: Génération du contexte intelligent...`);
    const context = generateGenesisContext(coverage);

    // ÉTAPE 3 : Construire le prompt enrichi
    const prompt = `
Tu es GENESIS, l'explorateur historique de la Machine Kiko.

🎯 MISSION : Génère ${maxBatchSize} événements MAJEURS de l'Histoire de France.

📊 ANALYSE DE LA BASE ACTUELLE :
La base contient ${coverage.totalEvents} événements, mais il manque ${coverage.majorEventsMissing} événements MAJEURS très connus des Français.

🔥 ÉVÉNEMENTS PRIORITAIRES À GÉNÉRER :
Voici les 10 événements les plus importants qui manquent (essaie d'en générer au moins 5-10) :
${context.priorities.topMissing.map((e, i) =>
        `${i + 1}. [${e.year}] ${e.pattern} (${e.category})`
    ).join('\n')}

📅 PÉRIODES SOUS-REPRÉSENTÉES :
Focus particulièrement sur ces périodes qui manquent d'événements majeurs :
${context.priorities.underRepresentedPeriods.map(p => `- ${p}`).join('\n')}

🏷️ CATÉGORIES À PRIVILÉGIER :
${context.priorities.underRepresentedCategories.map(c => `- ${c}`).join('\n')}

⚠️ RÈGLES STRICTES :

1. PRIORITÉ À LA NOTORIÉTÉ
   - Génère UNIQUEMENT des événements TRÈS CONNUS des Français
   - Événements enseignés à l'école primaire/collège
   - Dates commémorées nationalement
   - Tournants historiques majeurs
   - Personnages ultra-célèbres

2. EXEMPLES D'ÉVÉNEMENTS À GÉNÉRER :
   ✅ "Appel du 18 juin 1940" (De Gaulle, WW2)
   ✅ "Déclaration des Droits de l'Homme et du Citoyen" (Révolution)
   ✅ "Mort de Jeanne d'Arc sur le bûcher à Rouen" (Guerre de Cent Ans)
   ✅ "Libération de Paris" (1944)
   ✅ "Bataille de Valmy" (1792)
   ✅ "Abolition de la peine de mort" (1981)
   ✅ "Code Civil Napoléonien" (1804)
   ✅ "Massacre de la Saint-Barthélemy" (1572)

3. EXEMPLES D'ÉVÉNEMENTS À ÉVITER :
   ❌ Événements obscurs ou trop spécialisés
   ❌ Personnages secondaires peu connus
   ❌ Faits anecdotiques
   ❌ Inventions mineures

4. RIGUEUR HISTORIQUE :
   - Année EXACTE et vérifiée
   - Consensus historique établi
   - Pas de légendes ou faits contestés
   - Uniquement des événements >= 0 (après JC)

5. TITRES CLAIRS ET EXPLICITES :
   - Inclure le personnage ou lieu clé si pertinent
   - Exemples: "Mort de Louis XIV", "Bataille de Verdun", "Affaire Dreyfus"
   - INTERDICTION des titres de type "plage" (ex: "Règne de...") : privilégie des événements précis ("Sacre de...", "Mort de...", "Avènement de...").
   - ⚠️ INTERDICTION ABSOLUE : Ne mets JAMAIS l'année ou une date dans le titre (ex: PAS de "Appel du 18 juin 1940").
   - ⚠️ ANTI-HOMONYMIE : Si l'événement porte un nom récurrent (Siège de Constantinople, Bataille de Poitiers, Traité de Paris, Sac de Rome, etc.), tu DOIS ajouter un qualificatif entre parenthèses (protagoniste ou contexte) pour le distinguer sans le dater.

FORMAT JSON EXCLUSIF :
{
  "events": [
    { "titre": "Appel du 18 juin", "year": 1940 },
    { "titre": "Déclaration des Droits de l'Homme et du Citoyen", "year": 1789 },
    ...
  ]
}

🎯 RAPPEL : Privilégie les événements de la liste prioritaire ci-dessus !
`;

    console.log(`\n🤖 ÉTAPE 3: Génération des événements...`);

    try {
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text());

        // Sauvegarder le résultat
        const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/genesis_raw_batch.json');
        fs.writeFileSync(outputPath, JSON.stringify(data.events, null, 2));

        console.log(`\n✅ ${data.events.length} événements générés`);
        console.log(`\n📄 Événements générés:`);
        data.events.slice(0, 10).forEach((e, i) => {
            console.log(`   ${i + 1}. [${e.year}] ${e.titre}`);
        });
        if (data.events.length > 10) {
            console.log(`   ... et ${data.events.length - 10} autres`);
        }

        // Log avec contexte enrichi
        logDecision(
            agentName,
            'GENERATE_INTELLIGENT',
            {
                targetCount,
                batchSize: maxBatchSize,
                missingMajorEvents: coverage.majorEventsMissing
            },
            'SUCCESS',
            `${data.events.length} événements générés (Mode Intelligent)`,
            {
                file: 'genesis_raw_batch.json',
                topPriorities: context.priorities.topMissing.slice(0, 5).map(e => `${e.year}: ${e.pattern}`)
            }
        );

    } catch (e) {
        console.error(`\n❌ Erreur: ${e.message}`);
        logDecision(agentName, 'GENERATE_INTELLIGENT', { targetCount }, 'ERROR', e.message);
        process.exit(1);
    }
}

main();
