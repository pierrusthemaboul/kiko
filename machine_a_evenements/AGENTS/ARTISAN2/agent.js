
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const agentName = "ARTISAN2";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function main() {
    // Input chain: CHRONOS output > quality_gate output > orchestrator result > sentinel output
    const chronosPath = path.join(process.cwd(), '../CHRONOS/STORAGE/OUTPUT/chronos_audited_events.json');
    const qualityGatePath = path.join(process.cwd(), '../QUALITY_GATE/STORAGE/OUTPUT/quality_gate_passed.json');
    const orchestratorPath = path.join(process.cwd(), '../../orchestrator2_result.json');

    let events;
    let hasChronosData = false;

    if (fs.existsSync(chronosPath)) {
        console.log(`[${agentName}] Données CHRONOS trouvées (ancres historiques).`);
        events = JSON.parse(fs.readFileSync(chronosPath, 'utf8'));
        hasChronosData = true;
    } else if (fs.existsSync(qualityGatePath)) {
        console.log(`[${agentName}] Données QUALITY_GATE trouvées.`);
        events = JSON.parse(fs.readFileSync(qualityGatePath, 'utf8'));
    } else if (fs.existsSync(orchestratorPath)) {
        console.log(`[${agentName}] Données orchestrator2 trouvées.`);
        const data = JSON.parse(fs.readFileSync(orchestratorPath, 'utf8'));
        events = data.events;
    } else {
        console.error(`[${agentName}] Erreur: Aucun fichier source trouvé.`);
        process.exit(1);
    }

    if (!events || events.length === 0) {
        console.log(`[${agentName}] Rien à enrichir.`);
        return;
    }

    console.log(`[${agentName}] Enrichissement de ${events.length} événements...`);

    const rules = fs.readFileSync(
        path.join(process.cwd(), '../../choix_des_evenements.md'),
        'utf8'
    );

    const prompt = `
Tu es ARTISAN2, le sculpteur de détails PREMIUM du jeu Kiko.
Tu enrichis les événements avec une NOTORIÉTÉ CALIBRÉE pour le public français.

RÈGLES DU JEU :
${rules}

ÉVÉNEMENTS À ENRICHIR :
${JSON.stringify(events)}

MISSION :
0. ⚠️ VALIDITÉ HISTORIQUE (CHRONOS) : Si un événement a "is_historically_valid: false", tu DOIS le REJETER immédiatement.
1. VÉRIFICATION ANNÉE : Confirme l'année de consensus historique. Corrige si nécessaire.

2. ⚠️ ANTIPLAGE (CRITIQUE) : REJETTE les événements sans année précise ou qui décrivent une durée.
    - REJETTE : "Règne de...", "Période...", "Dynastie...", "Les années...".
    - ACCEPTE UNIQUEMENT des faits ponctuels : "Sacre de...", "Bataille de...", "Mort de...", "Invention de...", "Signature de...".
    - Si l'événement reçu est un règne (ex: "Règne d'Henri Ier"), tu PEUX le transformer en événement ponctuel (ex: "Sacre d'Henri Ier") si la date correspond. Sinon, REJETTE-LE.

3. ${hasChronosData ? '⚠️ ANCRAGE ANTI-ANACHRONISME : Intègre TOUTES les ancres historiques CHRONOS fournies.' : ''}

4. 🚫 RÈGLE D\'OR DU SILENCE : Ne mentionne JAMAIS les objets interdits.

5. 🌳 VERROU TERRESTRE & AMBIANCE :
   * INTÉRIEUR : Privilégie des éléments comme "stone walls", "heavy draperies", "tapestries", "closed wooden doors". Varie le vocabulaire.
   * EXTÉRIEUR : Sature de "dense forest", "mountainous terrain", "muddy ground", "dry earth", "rolling hills".
   * 🌊 ÉLÉMENTS MARITIMES (EXCEPTION) : Tu peux utiliser des éléments maritimes (mer, océan, port, vagues) UNIQUEMENT si l'événement est intrinsèquement lié à l'eau (découverte maritime, bataille navale, navire célèbre). Sinon, privilégie le terrestre.
   * AMBIANCE : Utilise "heavy chiaroscuro", "dark atmospheric painting", "rich pigments". Varie tes accroches pour chaque scène.

6. DESCRIPTION (FLUX-STIMULATING) : Scène narrative dense en ANGLAIS (100-150 mots). 
   * Ne sois pas répétitif. Chaque scène doit avoir son identité.
   * Sature les textures, les matériaux et la lumière.
   * Décris les vêtements, les outils, les expressions.

7. TITRE : Garde IMPÉRATIVEMENT le titre original.

8. 🎯 NOTORIÉTÉ CALIBRÉE FRANCE (CRITIQUE) :
   Score 0-100 avec ce barème :
   - 90-100 "Icône universelle" (Chute du mur de Berlin)
   - 75-89 "Culture générale solide" (Appel du 18 juin)
   - 50-74 "Scolaire classique" (Bataille de Marignan)
   - 35-49 "Culture générale élargie" (Invention du daguerréotype)
   - < 35 "Expert / Obscur" ⚠️ REJETTE en dessous de 35.

9. 🎯 THÈMES (MULTI-CHOIX) :
   Tu DOIS choisir un ou plusieurs thèmes (sous forme de tableau) parmi cette liste exacte :
   - Politique
   - Guerre & Militaire
   - Science & Technologie
   - Arts & Culture
   - Religion & Spiritualité
   - Économie & Commerce
   - Société & Social
   - Exploration & Découvertes
   - Catastrophes & Environnement
   - Sport
   - Justice & Droit
   - Santé & Médecine

10. REGION, TYPE : Précise les métadonnées. "type" doit être un TABLEAU de thèmes (ex: ["Politique", "Guerre & Militaire"]).

FORMAT JSON :
{
  "finished_events": [
    {
      "titre": "...",
      "year": 1234,
      "type": "...",
      "region": "...",
      "notoriete": 72,
      "notoriete_justification": "Enseigné au programme de 4ème, figure dans tous les manuels",
      "description": "English description for Flux..."
    }
  ],
  "rejected_events": [
    {
      "titre": "...",
      "year": 1234,
      "reason": "Notoriété < 40 : événement trop spécialisé"
    }
  ]
}
`;

    try {
        const result = await model.generateContent(prompt);
        const data = JSON.parse(result.response.text());

        const finished = data.finished_events || [];
        const rejected = data.rejected_events || [];

        // Final safety filter: reject anything ARTISAN2 scored below 35
        const finalFinished = finished.filter(e => {
            if (e.notoriete < 35) {
                console.log(`[${agentName}] ⚠️ Rejet final: "${e.titre}" (notoriété ${e.notoriete})`);
                rejected.push({ titre: e.titre, year: e.year, reason: `Notoriété ${e.notoriete} < 40` });
                return false;
            }
            return true;
        });

        const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/artisan2_finished_products.json');
        fs.writeFileSync(outputPath, JSON.stringify(finalFinished, null, 2));

        if (rejected.length > 0) {
            console.log(`\n[${agentName}] Événements rejetés par ARTISAN2 :`);
            rejected.forEach(r => console.log(`   ❌ "${r.titre}" (${r.year}): ${r.reason}`));
        }

        console.log(`\n[${agentName}] ✅ ${finalFinished.length} événements enrichis, ${rejected.length} rejetés.`);

        logDecision(agentName, 'ENRICH', { count: events.length }, 'SUCCESS',
            `${finalFinished.length} enrichis, ${rejected.length} rejetés`,
            { finished: finalFinished.length, rejected: rejected.length });

    } catch (e) {
        console.error(`[${agentName}] Erreur:`, e.message);
        logDecision(agentName, 'ENRICH', { count: events.length }, 'ERROR', e.message);
        process.exit(1);
    }
}

main();
