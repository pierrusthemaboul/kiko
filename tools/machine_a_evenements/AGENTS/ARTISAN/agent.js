
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { logDecision } from '../shared_utils.mjs';
import { GoogleGenerativeAI } from '@google/generative-ai';

const agentName = "ARTISAN";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL_SMART || "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" }
});

async function main() {
    // Prioriser orchestrator_result.json si disponible (pour les runs orchestrés)
    const orchestratorPath = path.join(process.cwd(), '../../orchestrator_result.json');
    const chronosPath = path.join(process.cwd(), '../CHRONOS/STORAGE/OUTPUT/chronos_audited_events.json');
    const sentinelPath = path.join(process.cwd(), '../SENTINEL/STORAGE/OUTPUT/sentinel_filtered_ids.json');

    let inputPath, filteredEvents;

    if (fs.existsSync(chronosPath)) {
        console.log("[ARTISAN] Audit historique trouvé (CHRONOS), lecture des ancres...");
        inputPath = chronosPath;
        filteredEvents = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    } else if (fs.existsSync(orchestratorPath)) {
        console.log("[ARTISAN] Mode orchestrateur détecté, lecture de orchestrator_result.json");
        inputPath = orchestratorPath;
        const orchestratorData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
        filteredEvents = orchestratorData.events;
    } else if (fs.existsSync(sentinelPath)) {
        console.log("[ARTISAN] Mode manuel détecté, lecture de sentinel_filtered_ids.json");
        inputPath = sentinelPath;
        filteredEvents = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    } else {
        console.error("[ARTISAN] Erreur: Aucun fichier source trouvé.");
        process.exit(1);
    }
    if (filteredEvents.length === 0) {
        console.log("[ARTISAN] Rien à sculpter.");
        return;
    }

    console.log(`[ARTISAN] Sculpture de ${filteredEvents.length} événements...`);

    const rules = fs.readFileSync('../../choix_des_evenements.md', 'utf8');

    function buildPrompt(batch) {
        return `
Tu es ARTISAN, le sculpteur de détails.
Enrichis les événements suivants selon ces règles :
${rules}

ÉVÉNEMENTS :
${JSON.stringify(batch)}

MISSION :
- VÉRIFICATION : Confirme l'année de consensus historique. Corrige si nécessaire. Le jeu ne requiert QUE l'année (pas le mois).
- ⚠️ ANTIPLAGE : REJETTE (ne mets pas dans "finished_events") les événements sans année précise ou notoirement BC mais datés AD. Ne te formalise pas si tu n'as pas le mois, l'année seule est tout à fait valide.
- ⚠️ ANCRAGE ANTI-ANACHRONISME (CHRONOS) : Tu DOIS intégrer TOUTES les ancres historiques fournies.
- 🚫 RÈGLE D'OR DU SILENCE : Ne mentionne JAMAIS les objets interdits. Ne cite PAS les mots de la liste "Forbidden".
- 🌳 VERROU TERRESTRE (ANTI-BATEAU) :
    * Si la scène est INTÉRIEURE : Ne mentionne JAMAIS "window", "sky" ou "view". Sature de "stone walls", "heavy draperies", "tapestries" ou "closed wooden doors". L'espace doit paraître clos pour empêcher l'IA d'ajouter un horizon marin.
    * Si la scène est EXTÉRIEURE (Land) : Sature de "dense forest", "mountainous terrain", "muddy ground", "dry earth". Ne mentionne JAMAIS d'eau ou d'horizon dégagé.
- NOTORIETE (NOTOREX FR) : Score 0-100 selon la perception d'un public FRANÇAIS :
    * 95-100 : Ultra-Iconique (ex: Prise de la Bastille, Tour Eiffel, 1998, De Gaulle).
    * 80-94  : Très connu, enseigné à l'école, image forte (ex: Sacre de Napoléon, Verdun, JFK).
    * 60-79  : Connu de toute personne ayant fini le collège (ex: Edit de Nantes, Marignan).
    * 40-59  : Connu des amateurs d'histoire ou via un film spécifique.
    * < 40   : Détail d'expert ou fait divers local.
- DESCRIPTION_FLUX (English) : Rédige une scène narrative et dense en ANGLAIS (100-150 mots). Utilise la stratégie "Positive Only". ⚠️ DROITS À L'IMAGE : Ne mentionne JAMAIS le nom exact de personnalités contemporaines (Zidane, politiciens). Décris un ou une personne "anonyme" MAIS en respectant sa physionomie originelle. 🕌 RÈGLE SUR LA RELIGION (ISLAM ET SACRÉ) : INTERDICTION ABSOLUE de faire dessiner par l'IA le Prophète de l'Islam (Muhammad) ou tout autre prophète sacré (Jésus, Moïse, etc.). Si l'événement est religieux, tu DOIS décrire uniquement des éléments symboliques sans visages sacrés : l'architecture (une mosquée, des minarets, une cathédrale), un livre saint (Coran, Bible) ou de la calligraphie. Jamais de caricatures. Décris les textures de manière saturée.
- DESCRIPTION_DETAILLEE (Français) : CRITIQUE. Rédige un paragraphe de 3 à 4 phrases en FRANÇAIS. Tu DOIS être EXTRÊMEMENT PRÉCIS et informatif. ⚠️ DATES EXACTES : Si tu mentionnes des années, des mois ou des jours dans cette description, ils DOIVENT être historiquement PARFAITS et vérifiés, ne donne aucune date approximative. Donne LE CONTEXTE, LES CAUSES et LES CONSÉQUENCES sans jamais être vague. L'utilisateur doit comprendre tout l'événement avec rigueur.
- TITRE : Maximum 60 caractères. Ne mets JAMAIS l'année ou une date dans le titre final. Si le titre original en contient une, SUPPRIME-LA. Si le titre devient trop générique sans la date (ex: "Bataille de Poitiers"), QUALIFIE-LE entre parenthèses avec un protagoniste ou un contexte (ex: "Bataille de Poitiers (Jean le Bon)"). ⚠️ ANTI-TRONCATURE : Si le titre original contient un qualificatif indispensable (ex: "par l'homme", "mécanique", un nom propre), tu NE DOIS PAS le supprimer pour gagner de la place. Reformule plutôt le titre entier pour rester sous 60 chars SANS perdre l'information clé (ex: "Premier sous-marin à propulsion humaine" plutôt que "Premier sous-marin propulsé").
- REGION, TYPE : Précise les métadonnées.

FORMAT JSON :
{
  "finished_events": [
    {
       "titre": "...",
       "year": 1234,
       "type": ["..."],
       "region": "...",
       "notoriete": 85,
       "notoriete_justification": "...",
       "description_flux": "...",
       "description_detaillee": "..."
    }
  ]
}
`;
    }

    // Traitement par batch de 10 pour éviter les réponses JSON tronquées
    const BATCH_SIZE = 10;
    const allFinishedEvents = [];

    try {
        for (let i = 0; i < filteredEvents.length; i += BATCH_SIZE) {
            const batch = filteredEvents.slice(i, i + BATCH_SIZE);
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(filteredEvents.length / BATCH_SIZE);

            if (totalBatches > 1) {
                console.log(`[ARTISAN] Batch ${batchNum}/${totalBatches} (${batch.length} événements)...`);
            }

            const result = await model.generateContent(buildPrompt(batch));
            const data = JSON.parse(result.response.text());
            allFinishedEvents.push(...data.finished_events);
        }

        const outputPath = path.join(process.cwd(), 'STORAGE/OUTPUT/artisan_finished_products.json');
        fs.writeFileSync(outputPath, JSON.stringify(allFinishedEvents, null, 2));

        logDecision(agentName, 'ENRICH', { count: filteredEvents.length }, 'SUCCESS', 'Métadonnées et descriptions ajoutées');

    } catch (e) {
        logDecision(agentName, 'ENRICH', { count: filteredEvents.length }, 'ERROR', e.message);
        process.exit(1);
    }
}

main();

